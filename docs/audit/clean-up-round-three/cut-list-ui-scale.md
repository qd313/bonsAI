# Cut list: remove UI scale

Written 2026-10-16 by the plan 86 step 2 removal reviewer (Sonnet 5.5 high), from the reader records (digest `ui-scale`) and a
fresh `git grep` over every tracked file, on `experimental` at `b5ce2768`. Every line number is a line at `b5ce2768`. The step 3
helper searches by the symbol or block named next to each range, because earlier removals move the lines.

## In plain words

**What a player notices.** Almost nothing. The "UI scale" section on the Settings tab (an "Adjust UI automatically" switch, a
two-step Handheld/Couch slider, "Reset to automatic", "Apply UI scale") is gone. It was already hidden unless the player had
turned on the Developer tab, and the automatic setting always picked the Handheld size for the plugin's narrow panel, which is
size 1: every box, gap and padding is exactly the size it is today. **One group will see a change:** a Developer-tab user who
had set the slider to Couch (1.18 times bigger) goes back to the normal size. **Text size (Small / Normal / Large) is not touched**
and keeps working on every tab. Steam's own "UI Scale" page in Steam Settings is not the plugin's feature and stays.

**What goes.** The Settings section and slider, the Handheld/Couch/Desktop/Immersive profiles and the screen-width measuring, the
scale context for popups, the "apply" toast, the two settings that stored the choice, the `--bonsai-ui-scale` number on the plugin's
root, and the `uiScalePx` helper. About 840 lines of code in six files go whole, plus five whole test files (25 tests).

**The one rule for the size helper (please read; this corrects the brief).** Plan 86 § 5 says "a scaled size becomes a plain number
times the text scale". There are two helpers and they must be treated differently:

- **`uiTextPx(n)` (43 calls) is a letter size.** Today it is `calc(n px * ui-scale * text-scale)`. It becomes **`textPx(n)`**,
  which is `calc(n px * var(--bonsai-text-scale, 1))`: a plain number times the one text-scale number that stays on the root.
  This is the case the plan sentence is about.
- **`uiScalePx(n)` (228 calls, 220 in code and 8 in one test) is a box size** (padding, gap, margin, width, height, radius).
  It is `calc(n px * ui-scale)` today and Text size has never touched it. It becomes **a plain `npx`** (no text scale).
  Multiplying boxes by the text scale would be a visible change: at Large every row, chip and bar would grow 15 percent and at
  Small shrink 10, and the code's own words forbid it (`textPx.ts` header: "Touches no heights, paddings, gaps or icon sizes: only the
  size of the letters. Rows keep their heights"; `chatTextSize.ts`: "scales only the letters, and will keep working when [UI scale]
  does [go away]"; `textSizeScan.test.ts` PLAIN_ON_PURPOSE). Exactly one of the 228 is a font size, `tabIndicatorBar.ts:155`
  (`font-size: ${uiScalePx(TAB_BAR_SHOULDER_MARK_PX)}`, the LB/RB marks), and `textSizeScan.test.ts` already lists it as plain on
  purpose, so it becomes `font-size: ${TAB_BAR_SHOULDER_MARK_PX}px`.
  **If the maintainer really does want boxes to follow Text size, that is a different, visible change and not this removal.**
  Open question 1 asks the one running the session to confirm.

**The proof that the swap changed nothing.** Before and after, build every stylesheet that uses the helpers (the scope
stylesheet, the modal-portal stylesheet, the chat-title stylesheet, the chats-menu and search-tab styles) and compare the text after
this one rewrite: `calc(Npx * var(--bonsai-ui-scale, 1))` to `Npx`, and `calc(Npx * var(--bonsai-ui-scale, 1) * var(--bonsai-text-scale, 1))`
to `calc(Npx * var(--bonsai-text-scale, 1))`. The two must be identical, character for character. The helper writes that check as a throwaway
script in its `.scratch/` folder and reports the result.

## Files that go whole

| File | Lines | Why it is wholly this feature |
|---|---|---|
| `src/components/SettingsTabUiScaleSection.tsx` | 323 | The Settings section: switch, slider, Reset, Apply, and their D-pad hops. Only user: `SettingsTab.tsx:70,232`. Its `scripts/focus-baseline.json` entry goes with it. |
| `src/components/SettingsTabUiScaleSlider.tsx` | 122 | The two-stop Handheld/Couch slider; only user is the section. (`DeckFocusSlider.tsx`, which it builds on, has three other users and stays.) |
| `src/data/uiScaleProfile.ts` | 171 | Profiles, thresholds, the screen-width classifier, the multiplier, `readUiScaleFromElement`. Users: the section, the hook, the context, the settings schema/normalizers/index (all edited below) and `useUnifiedInputSurface.ts:43` (see "settled" below). |
| `src/hooks/useUiScaleProfile.ts` | 143 | Measures the panel and writes `--bonsai-ui-scale` on the root. Only user: `index.tsx:439`. |
| `src/context/UiScaleContext.tsx` | 53 | Hands the scale style to popups. Users: `index.tsx:1270` and `BonsaiModalScope.tsx:25,43` only. Its `profileId`, `generation`, `requestApply` fields were read by nobody. |
| `src/styles/sections/uiScalePx.ts` | 22 | The helper itself. Goes last, once no call is left (`git grep -n "uiScalePx"` must print nothing under `src/`). |
| `src/components/SettingsTabUiScaleHeading.test.tsx` | 33 | Tests the section's heading (1 name). |
| `src/components/SettingsTabUiScaleHidden.test.tsx` | 72 | Tests that the section shows only with the Developer tab (2 names). |
| `src/components/SettingsTabUiScaleSection.greyedApply.test.tsx` | 104 | Tests the Apply hop (3 names). |
| `src/components/SettingsTabUiScaleSection.test.ts` | 70 | Tests the slider's D-pad handlers (6 names). |
| `src/data/uiScaleProfile.test.ts` | 123 | Tests the profile classifier (13 names). |

**Settled: the three files the readers said "also carry Text size".**

- `src/utils/uiScaleScopeBridge.ts` **stays.** Its job is to publish the plugin root's whole style (accent colour **and** the text scale)
  for popups that `showModal` draws outside the plugin's box (`useBonsaiScopeStyle.ts:63` publishes, `BonsaiModalScope.tsx:44` reads;
  `index.textSize.test.tsx` L32-86 asserts the text scale arrives through it). Nothing in it is about the UI scale except its name and header words:
  reword the header (L1-17). Renaming the file (suggested `scopeStyleBridge.ts`) and its two functions is a later move commit, not this one.
- `src/styles/sections/textPx.ts` **stays**; only `uiTextPx` (L27-30, its comment included) goes; `textPx`, `TEXT_SCALE_ROOT_CSS` stay.
- `src/data/uiScaleProfile.ts` goes whole, and the Ask bar's input surface needs nothing from it: `readUiScaleFromElement` (used at
  `useUnifiedInputSurface.ts:163`) returns 1 whenever `--bonsai-ui-scale` is absent (L168-170), and after this removal it is absent
  everywhere. So the multiplications by it are deleted, not replaced (see the group below).

## Changes inside files that stay

### The size helpers: every call site

Replace by this recipe (mechanical; a small script plus a read of the diff):

- `${uiScalePx(12)}` becomes `12px`. A negative or decimal literal keeps its sign: `${uiScalePx(-6.5)}` becomes `-6.5px`.
- `${uiScalePx(NAME)}` becomes `${NAME}px`; `${uiScalePx(-NAME)}` becomes `${-NAME}px`; `${uiScalePx(A + B)}` becomes `${A + B}px`.
- Inside a `calc(...)` the pixel text just drops in: `calc(${uiScalePx(5)} - 8px)` becomes `calc(5px - 8px)`; `calc(-1 * (${uiScalePx(PAD)}))` becomes `calc(-1 * (${PAD}px))`; `calc(6 * 1.15em + ${uiScalePx(4)})` becomes `calc(6 * 1.15em + 4px)`.
- `${uiTextPx(11)}` becomes `${textPx(11)}`, and the import `{ uiTextPx }` becomes `{ textPx }` (`section-6.ts` already imports both: keep one).
- Delete the `import { uiScalePx } ...` line in each file.

Every one of the 228 sits inside a CSS template string; no call is in arithmetic or a conditional. Counts and files (my own count; the readers' numbers
differ because they counted lines, not calls). After the read-aloud removal lands first, `answerBubbleCorners.ts` and the test block
in `answerBubble.test.ts` are already gone and the production total is 212 in 15 files.

| File | `uiScalePx(` calls | `uiTextPx(` calls |
|---|---|---|
| `src/features/search-tab/searchTabStyles.ts` | 57 (50 lines, L36-312; L109 is `uiScalePx(-6.5)`) | 14 (L41, 78, 127, 147, 161, 182, 194, 201, 242, 247, 291, 301, 306, 315) |
| `src/styles/sections/section-6.ts` | 44 (34 lines; the import is L57; constants at L217 `BONSAI_CHAT_INPUT_TO_TRANSCRIPT_GAP_PX`, L455 `BONSAI_CHAT_TRANSCRIPT_TO_SAVE_GAP_PX`; calc at L422) | 15 (L203, 368, 428, 448, 578, 600, 621, 653, 686, 704, 716, 730, 747, 763, 787) |
| `src/styles/sections/tabIndicatorBar.ts` | 26 (L103, 120-122, 135, 138-139, 143, 152, 155, 166-169, 173-176, 192-193, 208-209, 215-217, 257; names `TAB_STRIP_BODY_GAP_PX`, `TAB_BAR_HEIGHT_PX`, `TAB_BAR_EDGE_PAD_PX`, `TAB_BAR_COLUMN_GAP_PX`, `TAB_BAR_SHOULDER_W_PX`, `TAB_BAR_SHOULDER_MARK_PX`, `TAB_BAR_SHOULDER_REACH_PX`, `halfColumnGap`, `TAB_BAR_SIDE_ICON_PX + TAB_BAR_SIDE_ICON_GAP_PX`, `TAB_BAR_CURRENT_PAD_X_PX`, `TAB_BAR_CURRENT_ICON_PX`, `TAB_BAR_CURRENT_ICON_GAP_PX`; L167, 169, 174, 176 are negated; L155 is the one `font-size`, plain on purpose) | 1 (L226) |
| `src/features/chat-title/chatsMenuStyles.ts` | 22 (L36-150) | 5 (L51, 67, 99, 117, 151) |
| `src/styles/sections/userNotes.ts` | 15 (L34-123, 11 lines) | 0 |
| `src/styles/sections/section-5.ts` | 8 (L112 and L145, four inset constants `UNIFIED_TEXT_INSET_TOP/RIGHT/BOTTOM/LEFT_PX` each) | 2 (L115, L193) |
| `src/styles/sections/answerBubble.ts` | 8 (L88-90, 129, 136, 153, 162-163) | 0 |
| `src/styles/sections/answerBubbleCorners.ts` | 8 (**goes whole with read aloud; not edited here**) | 0 |
| `src/features/chat-sum-up/SessionTitleOffer.tsx` | 5 (L89, 90 x3, 106) | 2 (L95, L110) |
| `src/features/search-tab/SearchBackLine.tsx` | 5 (L33 x2, L39 x2, L40) | 1 (L36) |
| `src/styles/sections/questionBubble.ts` | 5 (L93-94, 132, 147-148) | 0 |
| `src/styles/sections/replyRatingChoices.ts` | 5 (L59, 63, 64 x2, 69) | 0 |
| `src/styles/sections/scopeBase.ts` | 4 (L147-150, constant `BONSAI_PLUGIN_SIDE_PAD_PX`; L147-148 are inside `calc(-1 * (...))`) | 2 (L157, L181) |
| `src/styles/sections/detailsSlot.ts` | 3 (L72, 75, 91) | 1 (L86) |
| `src/styles/sections/section-4.ts` | 3 (L173, L179 with `DOCK_ROW_GAP_PX`, L186 `BONSAI_CHAT_RESPONSE_STACK_MARGIN_TOP_PX`) | 0 |
| `src/styles/sections/section-3.ts` | 2 (L109-110, `BONSAI_PLUGIN_SIDE_PAD_PX`) | 0 |
| **Production code** | **220 in 16 files** (212 in 15 after read aloud) | **43 in 9 files** |
| `src/styles/sections/answerBubble.test.ts` (read-aloud block; goes with read aloud) | 8 | 0 |

The two helpers' union is the same 16 style files (all nine `uiTextPx` files also use `uiScalePx`). Counting the settings plumbing and tests below, the whole
removal touches about 55 files.

Comment-only mentions to reword when the wording becomes false: `unified-input/constants.ts` L30, L41, L130, L138 ("every use goes through
`uiScalePx()`", "before `--bonsai-ui-scale`"), `chatTitleStyles.ts` L16, `ChatTitleView.tsx` L33, `TitleTabStrip.tsx` L17, `chatSlotModal.ts` L29-31,
`scopeBase.ts` L60, `section-3.ts` L44, `section-6.ts` L349 and L414, `searchTabStyles.ts` L10, `DeckFocusSlider.tsx` L5, L13, `useTitleOverflow.ts` L22,
`TabBodyFocusRoot.tsx` L26 (a history note about a Deck screenshot: may stay), `SettingsTabChatTextSizeRow.tsx` L13, `useHiddenTabHeaderTrap.ts` L12, L36.

### The root, the popups and the scale number (screen)

The one number that stays on the root is **`--bonsai-text-scale`**: `withTextScale(...)` (`chatTextSize.ts`) writes it into the plugin root's style,
`useBonsaiScopeStyle` publishes the style through `uiScaleScopeBridge` for popups, `usePublishTextScale` carries it to Steam's shared page and
`chatTitleStore` to Decky's bar, and `TEXT_SCALE_ROOT_CSS` (`.bonsai-scope { font-size: calc(1em * var(--bonsai-text-scale, 1)) }`) applies it to
Steam's own controls. None of that changes. What stops existing: `--bonsai-ui-scale` is written nowhere and read nowhere.

- `src/index.tsx`
  - L140 (`useUiScaleProfile` import), L144 (`UiScaleProvider`), L145 (`normalizeUiScaleProfileId, type UiScaleProfileId`).
  - L365-368: the four UI scale entries in the settings-hook destructure (`uiScaleAutoEnabled`, `setUiScaleAutoEnabled`, `uiScaleManualProfile`, `setUiScaleManualProfile`).
  - L438-446: `const [uiScaleApplyToken, setUiScaleApplyToken] = useState(0);` and the `const uiScale = useUiScaleProfile({...})` call.
  - L268: `remeasureUnifiedInputSurface,` in the surface hook's destructure: its only other use was `onRemeasure` at L445, so it becomes unused. Check with the type check; if nothing else reads it, also drop it from `useUnifiedInputSurface`'s return (the unused-export check will say).
  - L620-626: the merged style. Replace `withTextScale(uiScale.scopeStyle, chatTextSize)` with `withTextScale({}, chatTextSize)` (memo on `[chatTextSize]`), keep the variable feeding `useBonsaiScopeStyle` at L632; reword the L619-621 comment ("beside the UI scale").
  - L661-684: the whole `onApplyUiScale` callback (toast "UI scale applied" at L675; its `callDeckyWithTimeout("save_settings", ...)` and `buildChangedSettingsPayload` use here are the only UI scale writes of the two keys).
  - L1036-1039: `uiScaleAutoEnabled`, `uiScaleManualProfile`, `appliedUiScaleProfileId: uiScale.appliedProfileId`, `onApplyUiScale` handed to the Settings tab.
  - L1253: `generation: uiScale.generation,` handed to `useTopStripTabBar` (see that file below).
  - L1270-1277 and L1314: the `<UiScaleProvider value={{...}}>` opening tag and its closing tag (keep the children; re-indent).
  - L1291: `<React.Fragment key={`bonsai-tabs-gen-${uiScale.generation}`}>` becomes a plain `<React.Fragment>` (the key only changed on an Apply; the generation was 0 forever otherwise). Reword the comment at L1286-1290 ("share one keyed fragment so a UI-scale Apply remounts both together"). Check imports (`toaster`, `callDeckyWithTimeout`, `useState`) that become unused.
- `src/features/chat-title/useTopStripTabBar.ts` (readers: "no removal", wrong): L45-46 (the `generation` prop and its comment), L53 (`generation` in the destructure), L61 `useEffect(() => notifyDeckyHeaderChanged(), [generation]);` becomes `useEffect(() => notifyDeckyHeaderChanged(), []);` with the same "once, on mounting" lint comment the line above carries. **Keep the effect**: with `[generation]` it also ran once on mount, and that mount-time notify must not be lost.
- `src/features/plugin-shell/useBonsaiScopeStyle.ts`: L22/L63 keep `publishUiScaleScopeStyle` for now (the bridge stays; only a later rename changes it); rename the argument `uiScaleScopeStyle` (L29, L44, L58-59) to `textScaleStyle` or keep it with a corrected comment; reword header L2-4, L14, L33, L37.
- `src/components/BonsaiModalScope.tsx`: L25 (`useUiScaleScopeStyle` import), L43 (`const contextStyle = useUiScaleScopeStyle();`), L47 `style={{ ...bridgeStyle, ...contextStyle }}` becomes `style={bridgeStyle}`. L9 and L38 comments. (The record said "keep L47": wrong, it must change.)
- `src/features/unified-input/useUnifiedInputSurface.ts`: L43 (import `readUiScaleFromElement`); L58 and L60 (`uiScale` parameter of `mirrorHeightAtNormalText` and `* uiScale` in `insetsPx`); L116 (comment); L163 (`const uiScale = readUiScaleFromElement(...)`); L167 (argument); L169-172: `bodyMinPx = UNIFIED_TEXT_BODY_MIN_PX`, `bodyMaxPx = UNIFIED_TEXT_BODY_MAX_PX`, `expandAheadPx = Math.ceil(UNIFIED_TEXT_FONT_PX * 1.2)`, `heightPadPx = UNIFIED_INPUT_HEIGHT_PAD_PX`. Text size's `readTextScaleFromElement` (L45-50) stays. Comment L150-162 mentions the Couch step: reword.
- `src/features/plugin-shell/useHiddenTabHeaderTrap.ts` L12, L36 and `useHiddenTabHeaderTrap.test.tsx` L105: comments about "a UI-scale Apply rebuilds the tabs": reword only.
- `src/features/chat-title/deckyHeaderShape.ts` L106: comment ("a UI-size Apply rebuilt bonsAI's tabs") reword.

### The setting (both sides) and the Settings tab

- Python `py_modules/backend/services/settings_service.py`: L88-89 (`UI_SCALE_PROFILE_IDS`, `DEFAULT_UI_SCALE_MANUAL_PROFILE`; both used only by the two rows), L494 (`"ui_scale_auto_enabled": _bool_default_true,`), L496-498 (the `"ui_scale_manual_profile": _enum(...)` row, three lines). `_bool_default_true` and `_enum` are used by other rows.
- `src/data/bonsaiSettingsSchema.ts`: L49 (`import { type UiScaleProfileId }`), L51 (`export type { UiScaleProfileId }`; its importers are all in this cut: `SettingsTab.tsx:76`, the section, the context, the hook, `index.tsx:145`), L210-213 (`ui_scale_auto_enabled` and `ui_scale_manual_profile` with their comments), L280-281 (`uiScaleAutoEnabled`, `uiScaleManualProfile` in the input shape).
- `src/data/bonsaiSettingsNormalizers.ts`: L67 (`import { normalizeUiScaleProfileId }`), L456-457 (the comment about the immersive gate), L507 (`ui_scale_auto_enabled: boolDefaultTrue`), L509 (`ui_scale_manual_profile: normalizeUiScaleProfileId`), L579-582 (the 0.6.0 comment and the `...(showDeveloperTab ? {} : { ui_scale_auto_enabled: true, ...})` spread). **Keep** `const showDeveloperTab` at L575: L596 still uses it.
- `src/hooks/usePluginSettings.ts`: L168-169 (the two rows); L375 comment.
- `src/utils/settingsPayload.ts`: L95-96 (`ui_scale_auto_enabled`, `ui_scale_manual_profile` lines).
- `src/features/plugin-shell/tabs/useSettingsTabPayload.tsx`: L53-56 (the four args), L92-95 (passed to `SettingsTab`), L119-122 (rebuild-list entries). Keep `chatTextSizeSetting` (L38, L77, L110).
- `src/components/SettingsTab.tsx`: L4 ("screen size" in the purpose line), L14 (comment "UI scale is a section only while the Developer tab is on"), L28-30 (diagram rows), L70 (`SettingsTabUiScaleSection` import), L76 (`UiScaleProfileId` import), L131-134 (four props), L181-184 (destructure), L191 (`useSettingsTabFocus(showDeveloperTab)` becomes `useSettingsTabFocus()`), L193 (`uiScaleAutoEnabled,` in the summaries input), L227-241 (the comment and the `{showDeveloperTab ? fold("uiscale", <SettingsTabUiScaleSection .../>) : null}` block). `showDeveloperTab` stays a prop (the Data section uses it).
- `src/features/folded-tabs/settingsTabFolds.ts` (the folded sections and the help strip's text):
  - L3 and L20-21 (header and Gotchas words); L39 (the `{ id: "uiscale", title: "UI scale" }` entry; `SettingsSectionId` loses `"uiscale"`); L53-56 (`settingsSectionIds(showDeveloperTab)` with its `|| id !== "uiscale"` filter: its only reason was UI scale, so it becomes `settingsSectionIds()` returning every id; update the callers `useSettingsTabFocus.ts:74`, `SettingsTab.folded.test.tsx` L72, L183, L233, `SettingsTab.foldedWalk.test.tsx` L35, L246, `settingsTabFolds.test.ts`); L100 (`uiScaleAuto` row words in `SETTINGS_ROW_HELP`); L114-123 (`uiScaleAutoHelp` and its comment); L132 (`uiScaleAutoEnabled` in `SettingsFoldValues`); L147 (the `uiscale:` summary line).
  - The help strip reads each row's words from a data attribute filled from `SETTINGS_ROW_HELP` through `DenseRow`/`DenseSwitchRow`'s `help` prop; the UI scale section was the only user of `uiScaleAutoHelp` (`SettingsTabUiScaleSection.tsx:38`), so nothing in the strip's own code needs changing.
- `src/components/useSettingsTabFocus.ts` (readers: "no removal", wrong): L29 import `settingsSectionIds` stays but loses its argument; L55 `useSettingsTabFocus(showDeveloperTab: boolean)` becomes no-argument; L72-80 the `useMemo` dependency `[showDeveloperTab]` becomes `[]`.
- `docs/demos/mockup-board-2/src/42-tabs-data.js` L48-50: the three lines `sec("UI scale")`, `tog("Adjust UI automatically", ...)`, `sbtn("Apply UI scale")` (what `settingsTabFolds.test.ts` and the drawing's own page read; see the tests section). Leave `measured: 2133` alone.
- `tests/contracts/settings-defaults.json`: delete L55-56 (`"ui_scale_auto_enabled": true,` and `"ui_scale_manual_profile": "handheld",`); not the last lines, commas stay valid. `tests/contracts/settings-hostile-inputs.json` has no UI scale case. `tests/contracts/README.md` L56-65 describes the immersive gate and the Developer-tab gate in prose: for the bookkeeper (documents).
- `scripts/focus-baseline.json`: remove the entry `"src/components/SettingsTabUiScaleSection.tsx": { "page-search": 1 }` (L44-46) and set `"total"` from 80 to 79 (regenerate with `node scripts/check-focus-patterns.mjs --update` and read the diff; the only change must be that one entry and the total). `scripts/growth_limits.json` and `scripts/ratchet.json`: no entry names a UI scale file; `ratchet check` improves `shell_props_to_tabs` (six props fewer on the Settings tab) and `files_over_400_lines` is unchanged (the deleted files are under 400 code lines).

### Tests that read source as text or settings, and test helpers

- `src/features/plugin-shell/tabBodyFocusCalls.test.ts`: L5 (comment) and L18 (`"SettingsTabUiScaleSection.tsx"` in `FILES`; the file would be missing).
- `src/styles/buttonFocusRing.test.ts`: L129 (`"components/SettingsTabUiScaleSection.tsx"` in `TAB_FILES`; it would read a missing file). L19 is a comment.
- `src/components/textSizeScan.test.ts`: L4 (comment) and L53: drop `uiTextPx\(|` from the regex after the swap; `calc(1em * var(` stays.
- `src/test-harness/settledFontSize.ts`: L7-9 header words and the `(?:ui|text)` in the L100 regex may stay (harmless); narrowing them is optional.
- `src/test-harness/tabBodyDeckGeometry.ts` L51-52: **stays** (measured Deck positions of an older Settings layout; see "What stays on purpose").
- `src/data/chatTextSize.test.ts` L20, L22: uses `--bonsai-ui-scale` only as an arbitrary key to show `withTextScale` keeps other keys; may stay, or swap in `--bonsai-test-key`.

## Settings that go

Two keys: **`ui_scale_auto_enabled`** (screen name `uiScaleAutoEnabled`, boolean, default true) and **`ui_scale_manual_profile`** (`uiScaleManualProfile`,
`handheld` | `desktop` | `couch` | `immersive`, default `handheld`).

Every place each is written (all listed above): Python `settings_service.py` L88-89, L494, L496-498; contract `settings-defaults.json` L55-56; screen
`bonsaiSettingsSchema.ts` L49-51, L210-213, L280-281, `bonsaiSettingsNormalizers.ts` L67, L456-457, L507, L509, L579-582, `usePluginSettings.ts` L168-169,
`settingsPayload.ts` L95-96, `index.tsx` (L365-368, L661-684, L1036-1039), `useSettingsTabPayload.tsx` (3 places), `SettingsTab.tsx` (5 places), `settingsTabFolds.ts`
(5 places); tests: `ringTestProps.ts` L40-43, the `SettingsTab*.test.tsx` props blocks, `settingsContracts.test.ts` (L39-67, L75-78, L374-375, L446-447, L599-600),
`usePluginSettings.readBack.test.ts` L93-94 (its first test requires this table to match the keys of `settings-defaults.json`, so the two edits land together),
`bonsaiSessionSurvival.test.ts` L69-70, `useBonsaiAskOrchestration.test.ts` L85-86, `SettingsDeveloperLeftoverRing.test.tsx` L89, `tests/test_settings_service.py` L633-660.

**An older saved settings file that still holds them** (including a Developer-tab user's saved `"couch"`): loads without an error and the values are ignored, by the same
mechanism as in the read-aloud list (Python `sanitize_settings` builds from the table only; the screen's `normalizeSettings` loops over the table only), and the
next save no longer writes them. The legacy `"desktop"` value needs no special case any more (it was only redirected to Handheld). Proof: the two tests named in
`cut-list-read-aloud.md` § "Settings that go" (`test_a_file_saved_with_removed_settings_still_loads_and_the_old_keys_are_dropped` in `tests/test_settings_service.py` and
`normalizeSettings: a settings file saved with removed settings (voice replies, UI scale) still loads and the old keys are not carried` in `src/utils/settingsContracts.test.ts`).
Whichever removal lands first adds them with its own keys; the second adds `ui_scale_auto_enabled`, `ui_scale_manual_profile` (with `"couch"`) to the same inputs. If this one lands
first, it writes them with the two UI scale keys and read aloud adds `voice_reply_mode`.

## Back-end methods that go

None. Checked against `baseline-rpc-methods.txt`: no name in it mentions the scale, and the scale was never a back-end call (the screen measured and saved it through `save_settings`).

## Tests that go or change

Test names are lines of `baseline-test-names-screen.txt` (`file > name`) and `baseline-test-names-python.txt`.

### Deleted whole files (exact names)

- `src/components/SettingsTabUiScaleHeading.test.tsx > UI scale section heading says UI scale exactly once, with the section open`
- `src/components/SettingsTabUiScaleHidden.test.tsx > SettingsTab UI scale section is drawn when the Developer tab is on`; `... SettingsTab UI scale section is not drawn for a player without the Developer tab`
- `src/components/SettingsTabUiScaleSection.greyedApply.test.tsx > the UI scale section's hops to Apply declines the hop while Apply is running, though the greyed button would take the ring`; `... goes to Apply again once it has finished`; `... lands on Apply from the switch when Apply is not running`
- `src/components/SettingsTabUiScaleSection.test.ts > UI scale slider bridge D-pad handlers A toggles edit mode on the bridge and claims the press`; `... Down prefers the reset button, and falls back to Apply only when reset cannot take it`; `... Left steps the manual profile exactly once and claims the move`; `... Right steps the manual profile exactly once and claims the move`; `... Up hands the ring to the auto toggle above the bridge`; `... wires no onButtonDown handler, so a single press cannot step the value twice`
- `src/data/uiScaleProfile.test.ts > uiScaleProfile classifyUiScaleProfile: auto external narrow -> handheld (desktop retired)`; `... auto external wide -> couch`; `... auto internal -> handheld`; `... manual mode uses manual profile`; `uiScaleProfile detectDisplayContext: Deck native screen is internal`; `... narrow viewport is internal`; `... the Deck's own panel, whichever way its size is reported`; `... the external monitor as the device actually reports it`; `... wide viewport on large screen is external`; `uiScaleProfile manualUiScaleProfileAtIndex snaps to the two real stops`; `uiScaleProfile normalizeUiScaleProfileId falls back to handheld`; `... redirects a legacy 'desktop' save to handheld, same scale as before`; `uiScaleProfile profileScaleMultiplier: couch > handheld`

25 names.

### Single tests deleted

- `src/features/plugin-shell/tabBodyFocusCalls.test.ts > focus calls in the plain tabs SettingsTabUiScaleSection.tsx has no plain .focus() call` (generated from the `FILES` entry above)
- `src/components/SettingsDeveloperLeftoverRing.test.tsx > the last Steam buttons on the four tabs draw the white ring Apply UI scale and Reset to automatic show the ring when Steam marks them` (L88-101)
- `src/components/SettingsTab.folded.test.tsx > the Settings tab with every section closed draws UI scale only while the Developer tab is on` (L69-76) and `... the Settings tab with every section open: one line per setting, longer words on the row names the size in use in the UI scale words` (L150-155)
- `src/features/folded-tabs/settingsTabFolds.test.ts > the Settings tab's sections leave UI scale out while the Developer tab is off` (L66-71) and `... the Settings tab's strip words put the UI scale line (with the size in use) before the switch's own description, as the drawing joins them` (L136-143)
- `src/utils/settingsContracts.test.ts > settings contracts normalizeSettings: ui scale defaults and manual profile` (L39-50), `... normalizeSettings: without the Developer tab, a saved manual UI scale loads as the default` (L52-67), `... normalizeSettings: a settings file saved with the retired 'desktop' UI scale still loads` (L75-78)
- `tests/test_settings_service.py`: `test_settings_service.SettingsServiceTests.test_ui_scale_settings_defaults_and_sanitize` (L633-660)
- `src/features/chat-title/topStripHeightLock.test.tsx > the panel reaches the bottom of the screen with the bar in Steam's strip a UI-size Apply (a new generation) re-measures too` (L122-127), and in the same file the `generation` prop of `BonsaiRoot` (L41, L45) and `Page` (L57, L60), plus `generation: 0` in `topStrip.test.tsx` L56 (the argument no longer exists).

That is 25 + 9 = 34 names deleted (and 1 Python name); the separately added tests are two (see "Settings that go").

### Tests that change (name kept) or are renamed

- `src/features/folded-tabs/settingsTabFolds.test.ts`: L3-4, L21, L29-31 (`DRAWN` loses `uiScaleAutoEnabled`), L48-70 (the section list: the slice anchor `names.indexOf("UI scale")` at L50 becomes `names.indexOf("Screenshot quality")` and the expected ids lose `"uiscale"`), L77, L92, L104 (summary lines), L121 (the `["UI scale switch", ...]` row).
  Rename: `the Settings tab's sections are the drawing's ten, in the drawing's order, under the drawing's names` -> `... the drawing's eight, ...` (it loses UI scale here and Voice replies in the read-aloud cut: ten minus two).
- `src/components/SettingsTab.folded.test.tsx`: L37 (import), L111 (the `Adjust UI automatically` words line). The `Developer tab` loop at L72 (`settingsSectionIds(false)`) compares against all ids now.
- `src/components/SettingsTab.foldedWalk.test.tsx`: L92 (the filter drops `s.id !== "uiscale"`), L114-116 (the first three `expectedOrder` entries: `/^UI scale/`, `"Adjust UI automatically"`, `"Apply UI scale"`), L161 (`/^UI scale/` becomes `/^Screenshot quality/`), L224 (the strip words for the UI scale row), L187-197. The four `Developer tab on/off: ...` tests keep their names (both variants now draw the same sections; step 5 may merge them). Rename L187: `with the Developer tab off the walk is the same without UI scale, and with the character off it skips the picker and the accent row` -> `with the character off the walk skips the picker and the accent row` (and delete the two UI scale lines in it).
- Settings tab props blocks, UI scale part (four lines each: `uiScaleAutoEnabled`, `uiScaleManualProfile`, `appliedUiScaleProfileId`, `onApplyUiScale`): `ringTestProps.ts` L40-43; `SettingsTab.accentMenuRing.test.tsx` L63-66; `SettingsTab.clearAllBack.test.tsx` L68-71; `SettingsTab.clearBoxes.test.tsx` L69-72; `SettingsTab.focusRing.test.tsx` L48-51; `SettingsTab.modalReturnFocus.test.tsx` L54-57; `SettingsTabPresetSingleChip.test.tsx` L44-47; `SettingsTabRememberTypedSwitch.test.tsx` L45-48; `SettingsDeveloperLeftoverRing.test.tsx` L89 (inside the deleted test); `useBonsaiAskOrchestration.test.ts` L85-86; `bonsaiSessionSurvival.test.ts` L69-70; `settingsContracts.test.ts` L374-375, L446-447, L599-600; `usePluginSettings.readBack.test.ts` L93-94.
- `src/styles/sections/section-4.test.ts`: the helper `px(value, uiScale)` (L177-185) loses its `var(--bonsai-ui-scale)` replacement and the `uiScale` argument; the loops over sizes 1, 1.18, 1.5 (L191-194, L198-201, L212-214) collapse to one plain-px check. Renames: `room under the suggestion chips (section 4 CSS) puts the chip one row gap above the question box, at every UI size` -> `... one row gap above the question box`; `... leaves no gap under the question box, the dock's last row since plan 84, at every UI size` -> `... leaves no gap under the question box, the dock's last row since plan 84`.
- `src/styles/sections/section-6.test.ts` (reply chips, L180-223): `scaled(px)` (L185) becomes `` `${px}px` `` (or the literal); the two test names that end `, scaled` lose the word: `... puts 5 between the reason chips, scaled and able to beat the shared row gap` -> `... puts 5 between the reason chips, able to beat the shared row gap`; `... makes each reason chip 24 tall with 2 by 8 padding, scaled` -> `... makes each reason chip 24 tall with 2 by 8 padding`. (The read-aloud cut removes the last describe of this file; the two edits do not overlap.)
- `src/styles/sections/replyRatingChoices.test.ts`: L94 comment and L115 (the regex that strips the multiplier so sizes read as plain pixels: delete it; the values are plain now).
- `src/features/plugin-shell/TabIndicatorBar.test.tsx`: L350 (`height: calc(20px * var(--bonsai-ui-scale, 1)) !important` becomes `height: 20px !important`), L369 (`--bonsai-tab-strip-reserve: calc(4px * var(--bonsai-ui-scale, 1))` becomes `4px`). `TabIndicatorBar.layout.test.tsx`: L72-73 comment and L79 pattern (the `ui` half of `(?:ui|text)` may stay; the plain-px branch below it already reads the new values).
- `src/styles/sections/answerBubble.test.ts`: only the read-aloud block used `uiScalePx` (all 8 calls are inside it; L13 import); both go with the read-aloud removal. If UI scale lands first, change those 8 to plain px and leave the block for the read-aloud lane.
- `src/components/textSizeScan.test.ts`, `src/components/textSizeEverywhere.test.tsx` (the describe `the scale lives in its own variable, apart from the UI scale ...`: unchanged and still passing; its name stays), `src/index.textSize.test.tsx` (stays: it asserts the bridge carries the text scale).
- `src/features/unified-input/useUnifiedInputSurface.test.ts` L157-163: comment only; the tests stay.

### Tests to add

- The shared "removed settings still load" pair (see "Settings that go").
- The before/after stylesheet equality check above is a one-time proof for the lane's report, not a permanent test. (A permanent guard already exists: `textSizeScan.test.ts` fails if a letter size skips the text scale.)

## What stays on purpose

- **Text size, entirely:** `chatTextSize.ts`, `textPx`, `TEXT_SCALE_ROOT_CSS`, `withTextScale`, `usePublishTextScale`, the chat-title store's text scale, `SettingsTabChatTextSizeRow`, the Text size section, and all text-size tests.
- **`uiScaleScopeBridge.ts`** (it carries the text scale and accent to popups; only its name and header are stale) and `BonsaiModalScope.tsx` (without the context read).
- **Steam's own "UI Scale" settings page** named in `src/data/settingsDatabase.ts` L130, L133 and `data/settings-search-targets.json` L86-87 (paths the Ask bar's local commands point people to).
- **`data/kb/compat_patterns.json` L1634** ("no separate UI-scale option": a game card about a game's own settings) and the comment at `py_modules/backend/services/knowledge_base_service.py:981`.
- **`src/components/deck/DeckFocusSlider.tsx`** and `deckSliderMath.ts` (used by the keep-alive slider, the reply-style slider and the connection-timeout slider). Check after the cut that no export became unused (the repo's unused-export check will say).
- **`src/test-harness/tabBodyDeckGeometry.ts` settings table** (its "Adjust UI automatically" / "Apply UI scale" rows are measured Deck positions of an older layout used by the walk tests with stand-in buttons; the labels are not wired to the real tab).
- **The 44 named layout constants** (`TAB_BAR_HEIGHT_PX`, `BONSAI_PLUGIN_SIDE_PAD_PX`, `UNIFIED_TEXT_INSET_*_PX`, ...) stay as constants; only the wrapper around them goes.
- **`readUiScaleFromElement`'s fallback behaviour** is the reason the surface hook needs no replacement (it already returned 1 with no variable).

## Documents that mention it

List only, for the bookkeeper: `AGENTS.md`, `CHANGELOG.md`, `docs/design-language.md`, `docs/design-tokens.md`, `docs/focus-graph.md`, `docs/roadmap-details.md`, `docs/testing.md`, `docs/testing-manual.md`, `docs/troubleshooting.md`, `docs/audit/maintainer-decisions-locked.md`, `docs/audit/maintainer-decisions-archive.md`, `docs/planning/67-stand-in-decks.md`, `docs/planning/86-clean-up-round-three.md` (§ 2 line about closing "the UI scale section says UI scale twice" is stale: that bug closed in plan 89), `tests/contracts/README.md` (L56-65, the two gates), `packages/bonsai-mcp/knowledge/architecture/focus-graph-patterns.md`, `packages/bonsai-mcp/knowledge/policies/decky-ui-focus.md`, `packages/bonsai-mcp/knowledge/workflows/deck-dev-loop.md`; and the drawing data `docs/demos/mockup-board-2/src/42-tabs-data.js` (edited in this lane). Archives (`docs/archive/*`, 10 files) are history: leave. The roadmap row for "the UI scale section says UI scale twice" and the Developer-tab UI scale rows in the testing documents are the bookkeeper's to close.

## Order and clashes

- **Land after read aloud** (read aloud deletes `answerBubbleCorners.ts` and one test block that hold 16 of the 228 calls). Land the glossary and ban-lookup lanes in any order relative to this one; they share settings plumbing and `SettingsTab` props.
- **Shared files** (one helper at a time, re-find blocks by name): `src/index.tsx`, `src/components/SettingsTab.tsx`, `src/features/folded-tabs/settingsTabFolds.ts` and its test, `src/components/useSettingsTabFocus.ts`, `src/features/plugin-shell/tabs/useSettingsTabPayload.tsx`, `src/components/ringTestProps.ts` and all `SettingsTab*.test.tsx` props blocks, `src/data/bonsaiSettingsSchema.ts`, `src/data/bonsaiSettingsNormalizers.ts`, `src/hooks/usePluginSettings.ts`, `src/utils/settingsPayload.ts`, `py_modules/backend/services/settings_service.py`, `tests/contracts/settings-defaults.json`, `src/utils/settingsContracts.test.ts`, `src/hooks/usePluginSettings.readBack.test.ts`, `src/styles/sections/section-6.ts` (the glossary and read-aloud lanes touch comments there), `src/styles/sections/answerBubble.ts` and `replyRatingChoices.ts` (read aloud edits comments/selectors on other lines), `docs/demos/mockup-board-2/src/42-tabs-data.js` (read aloud edits L65-66, this lane L48-50).
- **The style files** (`searchTabStyles.ts`, `tabIndicatorBar.ts`, `userNotes.ts`, `chatsMenuStyles.ts`, `section-3/4/5.ts`, `scopeBase.ts`, `detailsSlot.ts`, `questionBubble.ts`) are touched by no other removal. **Folder moves (step 4) must wait** until this lane has landed, or the move tool and this swap will fight over the same imports.
- **The glossary move** edits `MainTabChatTranscript.tsx` and the chip's own files only; no overlap with this list (no glossary file uses `uiScalePx`).

## The Deck check this removal needs

Own screen first, then the monitor (the `--bonsai-ui-scale` fallback is 1 on both, but the monitor is where Couch used to apply).

1. **Before/after rows.** With the plugin from before this lane loaded, record the heights of the Ask bar, the chip row, a finished answer, the tab bar (20 points), the Search tab's rows, the chats menu rows and the notes card; load the new build and check the same rows are the same size to the point (the stylesheet equality check says they must be; the Deck confirms the page agrees).
2. **Settings tab** with the Developer tab on and off: no "UI scale" section either way; open all sections; walk Down and Up (first line is "Screenshot quality" now); Open all button; the help strip words on each row; Text size Small / Normal / Large still change every word on every tab, and boxes keep their sizes.
3. **Popups** (the AI models box, a confirm box, the chat-title menu, the notes editor) carry the text size and the accent colour (the bridge) and look the same size as before.
4. **Decky's bar:** the chat name and the tab bar still draw in the title strip with the right height; open and close the panel twice; switch tabs (the header re-measure on mount still happens: this is the `useTopStripTabBar` effect edit).
5. **Ask bar at Large text:** type a three-line question; the box grows and the typed-text overlay lines up (the surface hook's maths lost its scale factor).
6. **Old saved file:** over SSH set `"ui_scale_manual_profile": "couch"` and `"ui_scale_auto_enabled": false` in the Deck's settings file (keep a copy), reopen: the plugin loads at the normal size, no error toast, and the keys are gone after the next saved change. Restore only the keys you changed.
7. **Free-play sweep** over every tab.

## Open questions for the one running the session

1. **Do boxes follow Text size? (the brief's sentence vs the code's own rule).** I read plan 86 § 5's "a plain number times the text scale" as applying to letter sizes (`uiTextPx` to `textPx`, 43 calls) and made the 228 box sizes plain pixels, for the reasons given under "In plain words". If you meant boxes to scale with Text size too, say so; it changes the recipe to `calc(Npx * var(--bonsai-text-scale, 1))` for all 228, and it is a visible layout change that needs its own Deck measurements (fixed-height rows would then clip or grow).
2. **The drawing's data file.** Same as read aloud: I edit `42-tabs-data.js` (L48-50 here, L65-66 there) so the folds test keeps comparing code with the drawing. Alternative: stop the test reading those sections.
3. **`settingsSectionIds` and the four `Developer tab on/off` walk tests.** Both variants now draw the same sections. I kept the loop and the names so no name changes; step 5 can merge them.
4. **A Developer-tab user who had picked Couch** goes back to the normal size on the first load. I count this as intended ("everyone gets the normal handheld size"); say if it needs a line in the release notes.
5. **Bridge rename.** `uiScaleScopeBridge.ts` and its two function names keep the old words until a later move/rename commit; confirm that is acceptable for the step 3 landing.

## Records found wrong

Checked 45 records. Wrong or incomplete:

- b11 `src/features/chat-title/useTopStripTabBar.ts`, removal: said "none". True: the `generation` prop (L45-46, L53) and its effect at L61 are the UI scale's (`index.tsx:1253` feeds it `uiScale.generation`); the effect must stay as a run-once effect.
- b11 `src/features/chat-title/topStripHeightLock.test.tsx`, removal: said "none". True: the test at L122 ("a UI-size Apply (a new generation) re-measures too") and the `generation` props at L41, L45, L57, L60 go; `topStrip.test.tsx:56` passes `generation: 0`.
- b35 `src/components/useSettingsTabFocus.ts`, removal: said "none". True: its `showDeveloperTab` argument and `[showDeveloperTab]` dependency existed only for the UI scale gate.
- b28 `src/components/BonsaiModalScope.tsx`, removal: said keep L47. True: L47 merges the context style that goes; it must become `style={bridgeStyle}`.
- b57 `src/features/search-tab/searchTabStyles.ts`: said 56 calls on 49 lines. True: 57 calls on 50 lines (L109 is `uiScalePx(-6.5)`).
- b35 `src/data/uiScaleProfile.ts` and b43 `src/hooks/useUiScaleProfile.ts`, unused-or-twice notes: right, and one thing they could not know: `useUnifiedInputSurface.ts`'s reading of the scale is a no-op once the variable is gone (settled above).
- b38 `src/features/folded-tabs/settingsTabFolds.test.ts`: right, but its removal list did not say the test reads `docs/demos/mockup-board-2/src/42-tabs-data.js` as text, so that file must change too (see above).
- b39/b43 style-file records (`section-3.ts`, `scopeBase.ts`, `section-4.ts`, `detailsSlot.ts`, `questionBubble.ts`, `replyRatingChoices.ts`, `answerBubble.ts`, `section-6.ts`): counts and lines confirmed by my own count (total 228 calls, 220 in code).
- The digest's `src/features/unified-input/constants.ts` record said "comments only": right.
- b13/b15/b28/b34/b40 settings plumbing records: line ranges confirmed; one omission shared with read aloud: `index.tsx`'s `remeasureUnifiedInputSurface` (L268) becomes unused.

(Counted as wrong for the tally: the first four and the b57 count. The rest are confirmations or additions.)
