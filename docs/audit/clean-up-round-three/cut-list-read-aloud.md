# Cut list: remove read aloud (also called "Voice replies", "the speaker")

Written 2026-10-16 by the plan 86 step 2 removal reviewer (Sonnet 5.5 high), from the reader records (digest `read-aloud`) and
a fresh `git grep` over every tracked file, on `experimental` at `b5ce2768`. Every line number is a line at `b5ce2768`.
The step 3 helper searches by the symbol or block named next to each range, because earlier removals move the lines.

## In plain words

**What a player notices.** The small speaker button in the bottom-left corner of every answer is gone. Copy stays in the
bottom-right corner, exactly where it is. The "Voice replies" section on the Settings tab is gone (Off / By voice /
Always). Nothing is ever read out loud by the plugin again. **Voice input (the mic button) is untouched**: you still
speak a question, press Stop, the whole recording is read once, and the text lands in the question box.

**What goes.** The text-to-speech service on the back end (it used the Deck's built-in espeak voice), its three calls,
the screen's Read aloud button logic, the speaker's styles and icon, the setting that decided when answers read
themselves, and the many small hand-offs that existed only to carry that setting around. About 1,090 lines of code in
four files go whole, plus seven whole test files and about 127 single tests. Edits land in about 70 other files, most of them
one to five lines each (test setups and comments).

**What stays.** Copy (its corner slot, its D-pad routes), the reply row (Helpful, Not really, Show details), voice input
and everything it shares with this feature (see "What stays on purpose"), the table finder the reply-ready toast uses,
the AI characters' "audiobook" flavour line (it is character style, not the feature).

**One thing the readers missed.** The "did this question come from the mic" memory was kept only so read aloud could
tell a spoken question from a typed one. Its plumbing runs through three files the readers recorded as "no removal":
`index.tsx` (a ref and one call), `useUnifiedInputBehaviors.ts` and `useSessionResetActions.tsx`. It all goes (see
"Changes inside files that stay", the voice group).

## Files that go whole

| File | Lines | Why it is wholly this feature |
|---|---|---|
| `py_modules/backend/services/voice_read_aloud_service.py` | 506 | The text-to-speech service: sentence splitting, the espeak voice, the player. Its only import from the rest of the back end is `env_for_audio_capture` (L67); nothing else imports it (checked: only `main.py:218`). Its `_safe_remove` (L204-210) is a private twin of `_remove_quietly` in `voice_model_download_service.py:232-237`, which stays. No download helper is shared. |
| `src/hooks/useReadAloud.ts` | 398 | The button's state, the polling, the "read on its own" rules and the voice-only memory (`noteAskPressed`, `questionCameFromMic`, `rememberAskCameFromMic`). Every export is read aloud's: users are the transcript, `useBackgroundGameAi.ts`, `bonsaiAskCompletionWatch.ts`, the voice wrapper, and its tests. |
| `src/hooks/useReadAloudAutoStop.ts` | 32 | Holds the one Read aloud instance and stops it on a new Ask. Only user: `MainTabChatTranscript.tsx:222,443`. |
| `src/styles/sections/answerBubbleCorners.ts` | 151 | The speaker's corner styles (`buildReadAloudCornerCss`, called only at `answerBubble.ts:187`). Its two Copy rules (L75-78, L139-141) match only when the speaker is drawn (`--after-read-aloud`), so they go too. |
| `tests/test_voice_read_aloud_service.py` | 478 | Tests only that service (28 names). |
| `tests/test_voice_read_aloud_rpc.py` | 100 | Tests only the three RPC pass-throughs and the silence on clear and unload (6 names). |
| `src/hooks/useReadAloud.test.ts` | 410 | Tests only `useReadAloud.ts` (26 names). |
| `src/components/MainTabChatTranscript.readAloud.test.tsx` | 320 | Tests only the speaker under an answer (9 names). |
| `src/features/voice/useVoiceAskWithReadAloud.test.tsx` | 218 | Every test is about reading a spoken question's answer (6 names). The hook's other job (waiting for the final text) is covered by `voiceFinishAtStop.test.tsx`. |
| `src/utils/answerBubbleNavigation.readAloudCorner.test.tsx` | 110 | Tests the speaker's lift clear of the dock (10 names). Copy's own lift is covered by `buildAnswerBubbleElement.test.tsx` and `answerBubbleNavigation.upLandingClear.test.ts`. |
| `src/utils/answerReadableText.test.ts` | 181 | Tests the spoken-text builder (15 names). Its one table case ("says there is a table on screen") is replaced by `toastAnswerPreview.test.ts` ("drops table rows", "drops a table written without a leading bar", "never takes a fence's opening line for a table row"), which test `replaceMarkdownTables` through the toast. |

**Not whole, although the readers leaned that way:**

- `src/utils/answerReadableText.ts` (151 lines) **stays, cut down to the table finder** (L43-79: `isTableRowLine`,
  `TABLE_SEPARATOR_ROW_RE`, `isTableSeparatorLine`, `replaceMarkdownTables`), because `src/utils/toastAnswerPreview.ts:30,160`
  imports `replaceMarkdownTables`. The file name is then wrong; moving the finder next to `toastAnswerPreview.ts` is a later
  move (step 4/5), not part of this removal.
- `src/utils/buildAnswerCornerSlots.tsx` (205 lines) **stays**, shrunk to Copy's slot alone.

## Changes inside files that stay

### Back end

- `main.py`
  - L30: the words "and read-aloud" in the module docstring sentence (keep "voice-input").
  - L218: `from backend.services.voice_read_aloud_service import VoiceReadAloudService`.
  - L307-309: in `Plugin.__init__`, the three lines `self._read_aloud_service = VoiceReadAloudService(os.path.join(... "read_aloud_tmp"))`. (`os` is still used elsewhere.)
  - L420: in unload, `await asyncio.to_thread(self._read_aloud_service.stop)`.
  - L2106-2107: in `forget_background_game_ai`, the comment "A cleared session must go silent..." and the stop call below it.
  - L2309-2319: the three methods `start_voice_read_aloud`, `stop_voice_read_aloud`, `get_voice_read_aloud_status` with their docstrings.
- `py_modules/backend/services/voice_rpc.py`
  - L298-321: the three functions `start_voice_read_aloud`, `stop_voice_read_aloud`, `get_voice_read_aloud_status`.
  - Docstring only: L1 (title), L4-5, L11-12 ("Used for" list), L14-15, L20: take read aloud out of the words. Imports are all still used.
- `py_modules/backend/services/chat_slot_rpc.py`
  - L212: in `delete_chat_slot`, the last line `await asyncio.to_thread(self._read_aloud_service.stop)`.
- `py_modules/backend/services/settings_service.py`
  - L505-507: the comment ("Voice. Off unless...") and the `"voice_reply_mode"` row of `_SIMPLE_FIELDS`. (`chat_text_size` L509-510 stays.)
- `py_modules/backend/services/voice_audio_capture_service.py`
  - L12-14 and L121-123: two docstring sentences that say the read-aloud service reuses `env_for_audio_capture`. No code changes; the function is still used at L137 and L187.
- `py_modules/backend/services/voice_transcription_service.py`
  - **Nothing.** The reader (b74) called the re-export `env_for_audio_capture` (L153) unused after this removal. It is not: `tests/test_seam_contracts.py:96` freezes it in `FROZEN["backend.services.voice_transcription_service"]`, and that test fails if the name goes. Leave it.
- `py_modules/backend/services/ai_character_service.py` L170: **stays** (see "What stays on purpose").

### Voice input glue: `src/features/voice/useVoiceAskWithReadAloud.ts` (174 lines) and everything that fed it

The hook stays. After the cut it joins the mic hook to Ask for one reason: Ask pressed while the mic listens (or while
Stop is still reading) waits for the final text, writes it into the box, then asks.

Arguments that go (the readers counted four; I checked: **four, and no others**): `clearAskCameFromMicRef`, `voiceReplyMode`,
`strategySpoilerMaskingEnabled`, `settingsLoaded`. Arguments that stay: `setUnifiedInput`, `unifiedInput`, `microphoneAccess`,
`isAsking`, `uiT`, `onAskOllama`.

- `src/features/voice/useVoiceAskWithReadAloud.ts`
  - L2-8, L15-16, L56-63, L118-131: header and block comments that describe read aloud or the mic flag (rewrite, do not just cut: the header must say what the hook does now).
  - L20: import `{ noteAskPressed, questionCameFromMic, setReadAloudCompletionContext }` from `useReadAloud`.
  - L24: `import type { VoiceReplyMode }`.
  - L35-39: the four arguments in `UseVoiceAskWithReadAloudArgs` (`clearAskCameFromMicRef`, `voiceReplyMode`, `strategySpoilerMaskingEnabled`, `settingsLoaded`, with the L38 comment).
  - L51: `clearAskCameFromMic` in the return type `VoiceAskWithReadAloud`. L171: `clearAskCameFromMic` in the returned object.
  - L71-74: the four names in the parameter destructure.
  - L85-87: `askCameFromMic` and `clearAskCameFromMic` from the `useVoiceAskInput(...)` destructure. **Keep `lastVoiceText`'s source in the hook (the tests read it), but this wrapper no longer needs it: drop L87 `lastVoiceText` here.**
  - L96-98: the effect copying `clearAskCameFromMic` into the ref.
  - L100-109: the effect calling `setReadAloudCompletionContext` (with its comments).
  - L113-114: shrink the `latest` ref to `{ onAskOllama, unifiedInput }`.
  - L154: `noteAskPressed(questionCameFromMic(...))` (keep the next line `return now.onAskOllama(overrideQuestion, opts);`).
  - L157-158: `const asked = ...` and `noteAskPressed(...)` (keep `return onAskOllama(overrideQuestion, opts);`).
  - L161: dependency list becomes `[onAskOllama, unifiedInput, voiceRecording, voiceFinishing, finishDictation]`.
  - `useRef`/`useEffect` imports: `useEffect` becomes unused; check with the type check.
  - **Name afterwards:** still `useVoiceAskWithReadAloud`, type `UseVoiceAskWithReadAloudArgs`/`VoiceAskWithReadAloud`, return key `onAskOllamaWithReadAloud`. The names are then misleading; the rename (suggested `useVoiceAsk`, `onAskOllamaWithVoice`) is a **separate later commit**. File rename = a move commit with `scripts/move_screen_file.mjs`; the exported names are a code change and cannot share that commit. Step 3 leaves all names alone so its diff stays about removing.
- `src/features/voice/useVoiceAskInput.ts`
  - L49-50, L55-65, L105-111: comments that describe the "came from mic" flag.
  - L112: `const [askCameFromMic, setAskCameFromMic] = useState(false);`.
  - L123: `setAskCameFromMic(true);` inside `setUnifiedInputFromVoice` (the `setLastVoiceText` lines stay).
  - L138-140: `clearAskCameFromMic`.
  - L336-337: `askCameFromMic`, `clearAskCameFromMic` in the return. **`lastVoiceText` stays** (state L115, rule at L252, returned L338, read by `useVoiceAskInput.test.ts` L133, L161, L266).
- `src/index.tsx`
  - L244-248: the comment and `const clearAskCameFromMicRef = useRef<() => void>(() => {});`.
  - L765 and L775: `clearAskCameFromMicRef,` passed to `useUnifiedInputPersistence` and `useSessionResetActions`.
  - L797: `clearAskCameFromMic,` in the voice hook's destructure. L805: `clearAskCameFromMicRef,` passed in. L806-808: `voiceReplyMode`, `strategySpoilerMaskingEnabled`, `settingsLoaded` passed in (`strategySpoilerMaskingEnabled` and `settingsLoaded` stay in `index.tsx` for other uses).
  - L960: `clearAskCameFromMic();` inside `onRunOriginalAsk`.
  - L798/L799/L916: **stay** (the wrapped ask `onAskOllamaWithReadAloud` is still what the Ask bar calls).
- `src/features/plugin-shell/useUnifiedInputBehaviors.ts` (readers: "no removal", wrong)
  - L64: `clearAskCameFromMicRef` in `UseUnifiedInputPersistenceArgs`. L79: the destructure. L95: `clearAskCameFromMicRef.current();`.
- `src/features/plugin-shell/useSessionResetActions.tsx` (readers: "no removal", wrong)
  - L60: type field. L94: destructure. L181: `clearAskCameFromMicRef.current();`.

### The "read on its own" watchers

- `src/hooks/useBackgroundGameAi.ts`: L10-11 (header words), L27 (import from `./useReadAloud`), L88-94 (comment) + L95-97 (the `if (status.status === "completed" || ...) { handleAskTerminalForReadAloud(status); }`), L99-100 (the comment and `handleAskPendingForReadAloud(status);` inside the `pending` branch; the rest of that branch, the poll delay, stays).
- `src/utils/bonsaiAskCompletionWatch.ts`: L8 (header words), L34 (import), L61 (`handleAskTerminalForReadAloud(status);`), L72 (`handleAskPendingForReadAloud(status);`).

### The speaker under an answer (screen)

- `src/components/MainTabChatTranscript.tsx`
  - L220: `import { buildAnswerReadableText }`. L222: `import { useReadAloudAutoStop }`.
  - L438-472: the `readAloud` hook call and `readAloudRowProps` (the comment block L438-442 included).
  - L879-881: the `readAloudBody?: string` parameter of `renderAnswerBubble` and its comment. L911: the `...(readAloudBody === undefined ? {} : readAloudRowProps(...))` line.
  - L1268: the fifth argument `turn.answer` of the archived `renderAnswerBubble(...)` call (the notes argument that follows becomes the fifth).
  - L1520-1521: the comment and the argument `isAsking ? undefined : lastExchange?.answer,` of the live call.
  - Comments only (reword if they describe present behaviour; "used to" history may stay): L18, L905, L949, L1310.
- `src/utils/buildAnswerBubbleElement.tsx`
  - L132-138: the prop comment and `onReadAloudToggle?`, `readAloudLabel?` props. L254-255: their destructure.
  - L364-374: the comment becomes Copy only; the call `buildAnswerCorners({ answerKey, streaming, getAnswerCopyText })`, and the destructure drops `showCornerReadAloud`.
  - L420-421: the `--with-read-aloud` class block. L454: the condition `showCornerCopy || showCornerReadAloud` becomes `showCornerCopy`.
  - Header and comments: L27, L30, L57-60, L503-505 (rewrite).
- `src/utils/buildAnswerCornerSlots.tsx` (becomes Copy-only; rewrite the L1-45 header)
  - L50: `ReadAloudSpeakerIcon` (and `AskStopIcon`, unused here after the cut) from the icons import; also drop the now-unused `BonsaiChatSecondaryButton` import (L48).
  - L61-71 / L75-77: `onReadAloudToggle`, `readAloudLabel` in `AnswerCornerArgs`; `showCornerReadAloud` in `AnswerCorners`; `rightIntoCorner` comment.
  - L83: `takeThenFocus`'s stop type becomes `"copy"` only.
  - L120-129: drop `onReadAloudToggle`, `readAloudLabel`, `readNavRef`, `showCornerReadAloud`, `isReadAloudSpeaking`; `rightIntoCorner` becomes `rightIntoCopy`'s result (Copy only).
  - L131-138: `leftOutOfCopy` becomes `upOutOfCorner()` (what it already did with no speaker); delete `leftOutOfReadAloud`, `rightOutOfReadAloud`.
  - L142-179: the whole speaker `Focusable` slot. L184: the `--after-read-aloud` class modifier on Copy's slot. L204: `showCornerReadAloud` in the return.
- `src/utils/replyStopRegistry.ts`: L57-58 (`"read-aloud-corner"` in `ReplyStopId` and its comment), L93 (its slot in `REPLY_STOP_ORDER`). Comments L5, L24, L68-70, L114: reword.
- `src/components/icons.tsx`: L229-248 `ReadAloudSpeakerIcon` and its comment (`AskStopIcon` L219-227 stays: the Ask bar uses it).
- `src/styles/sections/answerBubble.ts`: L10-11 (header words), L23 (import `buildReadAloudCornerCss`), L187 (`${buildReadAloudCornerCss()}`), L344-350: reword the comment and drop the selector `... + .bonsai-reply-read-aloud-corner-slot,` (L349) and the middle selector (L350) so only `.bonsai-chat-ai-bubble:has(.bonsai-stream-scramble) + .bonsai-reply-copy-corner-slot` remains.
- `src/styles/sections/replyRatingChoices.ts` L33-34 and `src/styles/sections/section-6.ts` L339-343: history comments about the speaker; reword or delete (no rule changes).
- Comment-only mentions (reword only where wrong now; checked by `git grep`): `BonsaiChatSecondaryButton.tsx:5`, `buildReplyActionsElement.tsx` (L20, L24, L306, L316, L347-348, L390, L446-447, L464, L534, L557, L618, L623), `liveTurnFocusGraph.ts` L248, L300-302, `answerBubbleWordsUp.ts:190`, `chat-sum-up/buildChatSummaryNoteElement.tsx:26` (the Down walk sketch), `expandOneLineSpoilerFences.ts` L11-12, `kbCloseMatchLineAgrees.ts:11`, `markdownFenceReader.ts` L7-8, L12, L14, `index.tsx` L58-59, `useReadAloud`-named words in `useBackgroundGameAi.ts`.
- `src/utils/answerReadableText.ts`: delete L12-15 (imports), L17 (`CODE_FENCE_RE`), L19-41 (the three spoken phrases and `BuildAnswerReadableTextArgs`), L81-151 (`flattenLineMarkers`, `flattenInlineMarkdown`, `buildAnswerReadableText`); keep L43-79. Rewrite the header (L1-11).
- `src/utils/markdownFenceReader.ts`: delete `collectFencedCodeSpans` (L118-129, with its comment L118) and `replaceFencedCodeBlocks` (L131-153). Keep `mayHoldFence` (L157; used by `answerCopyText.ts:12,63`). No test names it, so no test goes with it.
- `src/types/rpcMethods.ts` (generated): L72 `get_voice_read_aloud_status`, L97 `start_voice_read_aloud`, L99 `stop_voice_read_aloud`. The commit hook regenerates it; do not hand-edit.
- `src/test-harness/fakeDeckyRpc.ts`: L47-49 (the three names in the list) and L202-210 (the three handlers `start_voice_read_aloud`, `stop_voice_read_aloud`, `get_voice_read_aloud_status`).

### The setting `voice_reply_mode` / `voiceReplyMode` (both sides) and the Settings tab

- `src/data/bonsaiSettingsSchema.ts`: L63-67 (comment + `export type VoiceReplyMode`), L118-119 (field + comment), L241 (`voiceReplyMode` in the input shape), L311-312 (`DEFAULT_VOICE_REPLY_MODE`, `VOICE_REPLY_MODE_OPTIONS`).
- `src/data/bonsaiSettingsNormalizers.ts`: L81 and L84 (the two imports), L114 (`type VoiceReplyMode`), L484-488 (comment + the `voice_reply_mode: enumOf<VoiceReplyMode>(...)` row).
- `src/hooks/usePluginSettings.ts`: L129 (`voiceReplyMode: "voice_reply_mode"` row; the setter and the type come from the row).
- `src/utils/settingsPayload.ts`: L56 (`voice_reply_mode: input.voiceReplyMode,`). (`voice_stt_model` L94 stays.)
- `src/index.tsx`: L290-291 (`voiceReplyMode`, `setVoiceReplyMode` from the settings hook), L1018-1019 (handed to the Settings tab).
- `src/features/plugin-shell/tabs/useSettingsTabPayload.tsx`: L36-37 (args), L75-76 (passed to `SettingsTab`), L109 (the rebuild-list entry). (`voiceSttModel` L50-51, L89-90 stays.)
- `src/components/SettingsTab.tsx`: L6 and L41 (header words and diagram row), L62 `VOICE_REPLY_MODE_OPTIONS`, L65 `type VoiceReplyMode`, L87-89 (the three label/description imports), L101-103 (prop + comment), L161-162 (destructure), L200 (`voiceReplyMode,` in the summaries input), L325-341 (the whole `fold("voicereplies", ...)` block). `SettingsTabChoiceRow` stays (screenshot and text size use it).
- `src/features/folded-tabs/settingsTabFolds.ts` (the folded sections and the help strip's words):
  - L5-6 header words; L30 `VoiceReplyMode` in the type import; L46 the `{ id: "voicereplies", title: "Voice replies" }` entry of `SETTINGS_SECTIONS` (so `SettingsSectionId` loses `"voicereplies"`); L70-86 the three maps `VOICE_REPLY_MODE_LABEL`, `VOICE_REPLY_MODE_SHORT_LABEL`, `VOICE_REPLY_MODE_DESCRIPTION` (these hold the strip's words for the three picks; they live in code, not in a data attribute, and go); L139 `voiceReplyMode` in `SettingsFoldValues`; L158-160 the `voicereplies:` summary.
- `src/components/useSettingsTabFocus.ts`: L35, remove `"voicereplies"` from `FIRST_BUTTON_BOTH_WAYS` (it would no longer type-check). (The readers recorded this file as "no removal": wrong.)
- Drawing data the folds test reads: `docs/demos/mockup-board-2/src/42-tabs-data.js` L65-66 (`sec("Voice replies")` and the `choice("Voice replies", ...)` line). See the tests section for why.
- `tests/contracts/settings-defaults.json`: delete L60 `"voice_reply_mode": "off",` (not the last line; `"voice_stt_model"` follows, so commas stay valid).
- `tests/contracts/settings-hostile-inputs.json`: delete the two whole objects of the array at L529-537 (`"an unknown voice reply mode falls back to off, never to reading on its own"`) and L538-546 (`"voice reply mode is trimmed before matching"`). Both end in `},` and the next object (L547) follows, so the commas stay valid.
- `scripts/focus-baseline.json`, `scripts/growth_limits.json`, `scripts/ratchet.json`: **no entry names a read-aloud file or rule** (checked: `focus-baseline.json` has no entry for any file deleted here; `replyStopRegistry.ts`'s 3 page-search and 1 tabindex entries are on generic lines). After the cut run `python scripts/growth_limit.py` and `python scripts/ratchet.py check`; the plugin's `main.py`, `MainTabChatTranscript.tsx` and `index.tsx` get shorter and `shell_props_to_tabs` falls by two (the lead decides whether to record the better numbers). `scripts/ratchet.json` L171's shelved-roadmap ceiling is a document matter (see Documents).

### D-pad routes and stop registries naming the speaker

- `read-aloud-corner` in `replyStopRegistry.ts` (above) is the one registry entry; the route code is in `buildAnswerCornerSlots.tsx` (above). `answerBubbleNavigation.ts`, `liveTurnFocusGraph.ts`, `uiDocument.ts`, `focusNavigation.ts` name no read-aloud code (comments only). No other registry names the speaker. `src/styles/buttonFocusRing.test.ts` scans every `.tsx` for buttons with no ring class; the speaker's button is in a file that stays only as Copy, so nothing to change there (the scan loses one ringed button, which cannot fail it).
- Tests that read source as text and mention read aloud: `src/utils/answerReadableText.test.ts` (goes), `src/styles/sections/answerBubble.test.ts` (reads the built stylesheet; the read-aloud block goes). No test reads `useReadAloud*` or `voice_read_aloud_service.py` as text.

## Settings that go

One key: **`voice_reply_mode`** (screen name `voiceReplyMode`, values `off`, `voice_only`, `always`; default `off`).

Every place it is written (all listed above): Python `settings_service.py` L505-507; contract files `settings-defaults.json` L60 and `settings-hostile-inputs.json` L529-546; screen `bonsaiSettingsSchema.ts` (4 places), `bonsaiSettingsNormalizers.ts` (4), `usePluginSettings.ts` L129, `settingsPayload.ts` L56, `index.tsx` (2), `useSettingsTabPayload.tsx` (3), `SettingsTab.tsx` (several), `settingsTabFolds.ts` (several); tests: `SettingsTab.*.test.tsx` props blocks, `ringTestProps.ts` L21-22, `settingsContracts.test.ts` L340, L412, L562, `usePluginSettings.readBack.test.ts` L98, `bonsaiSessionSurvival.test.ts` L35, `useBonsaiAskOrchestration.test.ts` L48 (the reader said "read-aloud: none"; wrong), `voiceFinishAtStop.test.tsx` L300.

**An older saved settings file that still holds it.** Both sides already ignore keys they do not know, by construction:
Python `sanitize_settings` builds its answer only from `_SIMPLE_FIELDS` and the few named extras (`settings_service.py` L569, the `out = {name: coerce(...)}` line), and the screen's `normalizeSettings` loops only over `SIMPLE_FIELDS`
(`bonsaiSettingsNormalizers.ts` L557-561). So a file with `"voice_reply_mode": "always"` loads without an error, the value is
ignored, and the next save no longer writes it. No existing test proves this for a *removed* key (`test_ui_scale_settings_defaults_and_sanitize` only feeds a made-up `"bogus": 1`). **Add two tests**, shared with the UI scale removal (whoever lands first creates them, the second adds its keys):

- Python, in `tests/test_settings_service.py`, class `SettingsServiceTests`: `test_a_file_saved_with_removed_settings_still_loads_and_the_old_keys_are_dropped`. Feed `{"voice_reply_mode": "always", "ui_scale_auto_enabled": False, "ui_scale_manual_profile": "couch", "latency_warning_seconds": 20}` through `sanitize_settings` and through `load_settings` on a real file; assert no exception, `latency_warning_seconds` is 20, none of the three old keys is in the result, and a `save_settings` then `load_settings` round trip does not bring them back.
- Screen, in `src/utils/settingsContracts.test.ts`, describe `settings contracts`: `normalizeSettings: a settings file saved with removed settings (voice replies, UI scale) still loads and the old keys are not carried`. Assert the same from `normalizeSettings({ voice_reply_mode: "always", ui_scale_auto_enabled: false, ui_scale_manual_profile: "couch" })`: no throw, other fields at defaults, `"voice_reply_mode" in result` is false.

(Prove each by breaking it: temporarily put a `voice_reply_mode` row back into the table and see the test fail, as the repo's habit asks.)

## Back-end methods that go

Checked against `baseline-rpc-methods.txt`: three of the 68 names go (baseline lines 35, 60, 62), leaving 65:

- `get_voice_read_aloud_status`
- `start_voice_read_aloud`
- `stop_voice_read_aloud`

`get_voice_engine_status`, `get_voice_install_status`, `get_voice_transcription_status`, `install_voice_engine`, `start_voice_transcription`, `stop_voice_transcription` are voice input and **stay**. Their `main.py` methods (L2285-2307) stay. Plain Python helpers that go with the methods: the whole of `voice_read_aloud_service.py` (`VoiceReadAloudService`, `EspeakSentenceMaker`, `SessionAudioPlayer`, `split_into_sentences`, `espeak_available`, `player_available`, `_safe_remove`).

## Tests that go or change

Test names are the lines of `baseline-test-names-screen.txt` (`file > name`) and `baseline-test-names-python.txt` (`module.Class.test`).

### Deleted whole (names are every baseline line starting with the path below plus ` > `; counts checked)

Screen: `src/hooks/useReadAloud.test.ts` (26), `src/components/MainTabChatTranscript.readAloud.test.tsx` (9), `src/features/voice/useVoiceAskWithReadAloud.test.tsx` (6), `src/utils/answerBubbleNavigation.readAloudCorner.test.tsx` (10), `src/utils/answerReadableText.test.ts` (15). That is 66 names.
Python: every baseline line starting `test_voice_read_aloud_service.` (28) and `test_voice_read_aloud_rpc.` (6). That is 34 names.
(To print any list: `grep -F "<path> > " docs/audit/clean-up-round-three/baseline-test-names-screen.txt`. I pasted counts, not all 100 lines, to keep this file readable.)

### Single tests deleted (screen; `file > name`)

- `src/components/MainTabChatTranscript.ratingRowWalk.test.tsx > Up and Down between the rating choices, the thumbs and the corner icons (plan 79, plan 84 step 3) walks the corner: the speaker, Copy, Down to Bad info, Up to Helpful -- no stop twice` (L309-322)
- `src/components/MainTabChatTranscript.replyBlock.test.tsx > a finished reply, all three changes together keeps the speaker out of the row under the answer` (L127-132)
- `src/components/MainTabChatTranscript.stoppedNotice.test.tsx > stopped turn — notice and reply actions restored on the archived turn offers no Read aloud on an empty stop: there is nothing to read` (L189-213)
- `src/components/MainTabChatTranscript.stoppedNotice.test.tsx > stopped turn — notice and reply actions restored on the archived turn still offers Read aloud on a stop that kept part of the answer` (L246-257)
- `src/components/MainTabChatTranscript.upWalk.test.tsx > Up under a finished answer visits the rows Down visits (plan 72 A-4) Read aloud, in the answer's corner, goes Up into the answer's last section, not onto a choice` (L252-261)
- `src/components/MainTabChatTranscript.upWalk.test.tsx > Up under a finished answer visits the rows Down visits (plan 72 A-4) with no choices, Read aloud still goes Up into the answer's last section` (L277-283)
- `src/features/voice/useVoiceAskInput.test.ts > useVoiceAskInput askCameFromMic flag is false until a transcription lands`; `... is set once a transcription is written into the field`; `... clearAskCameFromMic turns the flag back off, for a manual edit or a clear` (the whole describe L23-101)
- `src/utils/buildAnswerBubbleElement.test.tsx`: 13 of the 14 tests of the describe `Read aloud in the answer bubble's lower-left corner (plan 84 step 3)` (L966-1177): `A on the speaker calls the toggle, every press`; `Down from Read aloud goes where Down from Copy goes: Helpful, else Show details`; `Left from Copy with no speaker still returns to the answer`; `Right from the last section reaches Read aloud first, and Copy only when there is no speaker`; `Up from Read aloud goes back to the answer's last section, like Copy's Up`; `draws nothing while the answer is still arriving, or when no handler is supplied`; `draws the speaker inside a corner slot on a finished answer, icon only`; `marks the bubble so the stylesheet can keep the last line clear of the speaker`; `registers under its own reply-stop name, read-aloud-corner`; `says Stop and turns red while this answer is being read`; `sits after the bubble and before Copy, never inside the bubble`; `still draws without Copy (a speaker alone is a valid corner)`; `the speaker is no longer a stop below the answer: Down never lands on it`; `walks the bottom edge right and back: answer, Read aloud, Copy, Read aloud, answer, no stop twice going right`. (Two of these, `Left from Copy with no speaker still returns to the answer` and `still draws without Copy`, are really about Copy: keep `Left from Copy with no speaker still returns to the answer` as a Copy test by moving it out of the deleted describe, because it pins the route this removal makes permanent. The helper may keep it under its own name; list that in its report.)
- `src/styles/sections/answerBubble.test.ts`: all 11 tests of the describe `Read aloud in the answer's lower-left corner -- stylesheet (plan 84 step 3)` (L93-256): `draws the icon at Copy's size and weight`; `draws the slot into the bubble's bottom-left corner, the mirror of Copy's`; `gives a bubble with the speaker a bottom band of 25 (see the arithmetic below)`; `holds both corners back while any letter is unsettled`; `puts Copy on the same strip when it follows the speaker: it pulls up 26, not 38, and the speaker gives back no height`; `stands Copy's end-of-line spacer and its code-box room down while the band is there`; `the bottom band holds the icon, its inset and its ring (P84-READ-01 follow-up) and for Copy when it shares the band`; `... band + border >= box + inset + ring + clearance, for the speaker`; `... keeps the ring inside the bubble: the inset is at least the ring's reach below the box`; `... puts the reply block back where it sat: bottom margin = bubble margin 8 + inset`; `turns red while reading, and shows the white ring when the D-pad is on it`. ("holds both corners back while any letter is unsettled" also covers Copy: re-add a Copy-only version, new test name `holds Copy's corner back while any letter is unsettled`, from the L349-350 selectors.)
- `src/styles/sections/replyRatingChoices.test.ts > the calmer rating choices (plan 79, after 2: smaller and softer) leaves the speaker's bare glyph alone: it is Copy's kind of icon in the answer's corner, not a choice` (L184-190)
- `src/styles/sections/section-6.test.ts > Read aloud is no longer styled as a row item (section 6 CSS, plan 84 step 3) has no "Saved on this Deck" centring rule for a row the label no longer shares` and `... has no rule left that styles the speaker in the thumbs row` (L225-241)
- `src/utils/liveTurnFocusGraph.test.ts > liveTurnFocusGraph focusDownFromLiveAnswerBubble no longer stops at a Read aloud line, even with the corner speaker mounted` (L343-369; it registers `read-aloud-corner`, which no longer exists)
- `src/utils/buildReplyActionsElement.test.tsx > buildReplyActionsElement no longer draws Read aloud draws no speaker beside the thumbs` (L726) and `... registers no speaker stop` (L746: it reads `getReplyStop("read-aloud-corner")`, which would not type-check). Its other two tests in that describe stay.
- `src/utils/oneLineSpoilerCopyAndReadAloud.test.ts > a hidden block written on one line, in Copy and Read aloud is never read aloud (...)` x4: `(own line, raw)`, `(own line, after the safety net)`, `(glued to a bullet, raw)`, `(glued to a bullet, after the safety net)` (L37-43)
- `src/utils/spoilerFenceOddShapes.test.ts > a hidden block written oddly, in Copy and Read aloud is never read aloud (...)` x7: `(a ~~~ block)`, `(a ~~~ block with a blank line inside)`, `(a ~~~ block holding a ``` line)`, `(a four-backtick block with a ``` line inside)`, `(a block in a bullet)`, `(a block in a quote)`, `(a ``` block with a blank line inside)` (L68-75; delete every baseline line that ends `is never read aloud (<shape>)`: seven in all)
- `src/utils/tildeCodeReadAloud.test.ts > Read aloud and a code block that is not fenced with three backticks` ...: `does not turn a lone ~~~ inside a sentence into code`; `says each of two blocks of different kinds, and keeps a hidden block hidden`; `says there is code on screen (a four-backtick block holding a ``` line)`; `... (a ~~~ block in a bullet)`; `... (a ~~~ block with a blank line inside)`; `... (a ~~~ block with a language)`; `... (a ~~~ block)`; `still says the phrase once for a three-backtick block`. Keep `leaves Copy keeping the code, as it does for a backtick block`.
- `src/data/bonsaiSettingsHostileContract.test.ts > settings hostile-input contract an unknown voice reply mode falls back to off, never to reading on its own` and `... voice reply mode is trimmed before matching` (generated from the two JSON objects deleted above)
- `src/components/SettingsTab.folded.test.tsx > the Settings tab with every section open: one line per setting, longer words on the row changes the Voice replies words with the pick` (L143-148)

That is 127 screen names in all (66 whole-file + 61 single).

### Tests that change but keep their names (edit the body only)

`MainTabChatTranscript.ratingRowWalk.test.tsx` (L193 and L258: drop the `"Read aloud"` entries in the stop list and the icon loop; names `Down from either corner icon lands on the first choice...` and `Up from the first choice row lands on the thumb drawn above it, not on the speaker` stay), `MainTabChatTranscript.upWalk.test.tsx` (L208-211 drop `screen_noReadAloudRow`; L327 one assertion), `MainTabChatTranscript.stoppedNotice.test.tsx` (comments L215-216), `MainTabChatTranscript.spoilerStaysOpen.test.tsx` (comment L10), `voiceFinishAtStop.test.tsx` (L299-302: remove the four arguments `clearAskCameFromMicRef`, `voiceReplyMode`, `strategySpoilerMaskingEnabled`, `settingsLoaded` from the wrapper setup), `emptyLabelSpoilerMark.test.tsx` (drop `buildAnswerReadableText` and `SPOILER_HIDDEN_SPOKEN_PHRASE` use: L9, L18, L75-87 first test's spoken half, L105, L132, L142, L157, L173, L196-204; the Copy and toast halves stay), `gluedSpoilerOpener.test.tsx` (L8, L18, L75-80: the five generated tests keep checking Copy only), `oneLineSpoilerCopyAndReadAloud.test.ts` (L2-3, L8-9, L14, L47-51, L60, L64-66: spoken halves go), `spoilerFenceOddShapes.test.ts` (L10, L79-80, L84, L93, L99-100), `buildAnswerBubbleElement.test.tsx` (L253, L398-402, L928-929 comments; L284-295 and L436-445 the stand-in `readAloud` element that plays Show details: rename the variable only; the `build()` helper's `withReadAloud` option goes), `replyStopRegistry.test.ts` (L40-52, drop the `read-aloud-corner` asserts), `SettingsTab.*.test.tsx` props blocks (below), `settingsContracts.test.ts`, `usePluginSettings.readBack.test.ts` L98, `bonsaiSessionSurvival.test.ts` L35, `useBonsaiAskOrchestration.test.ts` L48, `fakeDeckyRpc.ts` users (none beyond the list).

Settings tab tests, read-aloud part only (each also has a UI scale part, see the other cut list): `SettingsTab.accentMenuRing.test.tsx` L44-45; `SettingsTab.clearAllBack.test.tsx` L49-50; `SettingsTab.clearBoxes.test.tsx` L50-51; `SettingsTab.focusRing.test.tsx` L7 (header), L29-30, L90 (the line `...getAllByLabelText(/^(Off|When I asked by voice|Always): /)...`; 7 buttons remain, the `>= 6` check holds); `SettingsTab.modalReturnFocus.test.tsx` L35-36; `SettingsTabPresetSingleChip.test.tsx` L25-26; `SettingsTabRememberTypedSwitch.test.tsx` L26-27; `SettingsTabUiScaleHidden.test.tsx` (goes with UI scale); `ringTestProps.ts` L21-22; `SettingsTab.folded.test.tsx` L34 (import), L82 (prop), L88 (summary), L118 (the `Voice replies` words line), L136 (the "must not print" entry), L194 (`["Voice replies", "voicereplies"]` in the walk rows); `SettingsTab.foldedWalk.test.tsx` L130-131 (`/^Voice replies/`, `/^Off: /` in `expectedOrder`) and the anchor test L235-256; `settingsTabFolds.test.ts` L22, L38, L48-63 (`voicereplies` in names and ids), L84, L99, L111, L129-131 (the three `Voice replies:` rows of `fromDrawing`).

### Renames the change forces (old name -> new name; step 5 compares names, so list them)

- `SettingsTab.foldedWalk.test.tsx`: `the floating Open all button on the Settings tab Right from Voice replies puts the ring on it; A opens every section (Close all); Down holds; Up returns to Voice replies` -> same sentence with `Voice input` for both `Voice replies` (the test starts from a middle section line; any section line works, and Voice input is the neighbour that stays).
- `MainTabChatTranscript.replyBlock.test.tsx`: `... reads top to bottom: question, answer, Read aloud and Copy in its corners, Was this helpful?, then Show details` -> `... reads top to bottom: question, answer, Copy in its corner, Was this helpful?, then Show details`.
- `replyStopRegistry.test.ts`: `reply stop registry walks Retry, then the notes line, then Show reasoning, then Read aloud and Copy along the answer's bottom edge` -> `... then Copy along the answer's bottom edge`.
- Names that keep stale wording on purpose (`...in Copy and Read aloud ...` in the spoiler tests, `tildeCodeReadAloud`, `oneLineSpoilerCopyAndReadAloud`): left alone here; step 5 merges those files by topic and renames them with their pairs listed.

### Tests to add

- The two "removed settings still load" tests (see "Settings that go").
- A `replaceMarkdownTables` test **is not needed**: `toastAnswerPreview.test.ts` already covers it (three tests named above).
- No test is needed for "no speaker drawn": a speaker with no code behind it cannot be drawn.

## What stays on purpose

- **Voice input, end to end:** `useVoiceAskInput.ts` (minus the flag), `useVoiceTranscription.ts`, `useVoiceAskWithReadAloud.ts` (the wait-for-final-text wrapper), `voice_rpc.py` L1-297, `voice_transcription_service.py`, `voice_audio_capture_service.py`, `voice_model_download_service.py`, `voice_whisper_*`, `VoiceInputSettingsSection.tsx`, the Ask bar's mic button and its tests. Shared code between the two voice paths in the back end is exactly one thing: `env_for_audio_capture` (`voice_audio_capture_service.py` L118), still used by the mic code at L137 and L187 and re-exported at `voice_transcription_service.py:153` (frozen by `test_seam_contracts.py:96`).
- **`useVoiceAskInput`'s `lastVoiceText`:** its box-emptied rule (L252) needs it; tests read it.
- **`isStopNoticeResponse`, `closeMatchAgrees`, `stripAssistantDisplayTags`, `expandOneLineSpoilerFences`, `replaceSpoilerFences`, `unwrapAskedEntitySpoilerFences`, `protectedNamesFromNotes`:** the copy path and the reply-ready toast use them.
- **`AskStopIcon`** in `icons.tsx` (the Ask bar's Stop and mic buttons use it).
- **Copy's corner slot, `ReplyCopyButton`, `downOutOfCorner` routes, `--with-copy` styles** in `answerBubble.ts` (L88-90, L129-136, L153, L162-163 and the others): Copy alone behaves as it does today when no speaker is drawn (`leftOutOfCopy` already returned to the answer in that case).
- **`ai_character_service.py` `_STRATEGY_AUDIOBOOK_ADDON` (L169-174, used at L515):** it tells the model, in Strategy mode with a character on, to write "like an audiobook". That is flavour for AI characters (kept by the maintainer's call 4) and pinned by `test_ai_character_service.py` L62-72. Changing it would change answers. If the maintainer wants the word gone, that is a separate prompt decision.
- **`src/test-harness/tabBodyDeckGeometry.ts` settings table** (L51-52 "Adjust UI automatically"/"Apply UI scale", L63 "Off: Answers are read only when yo"): measured Deck positions of an older Settings layout that the walk tests lay synthetic buttons over; the labels are not wired to the real tab. Re-measuring is a Deck job, not part of this removal.
- **The leftover `read_aloud_tmp` folder** inside the plugin's settings folder on a Deck that used the feature: at most a few audio files; no cleanup code is worth writing.
- **History comments** that say "used to" (`replyRatingChoices.ts`, `section-6.ts`, `buildReplyActionsElement.tsx`): reword only if they now say something false.

## Documents that mention it

List only, for the bookkeeper. Active documents: `AGENTS.md`, `CHANGELOG.md`, `docs/guide.md` (7 mentions: the user guide), `docs/focus-graph.md` (14), `docs/design-tokens.md` (3), `docs/code-clarity.md`, `docs/lessons-learned.md`, `docs/roadmap.md` (8), `docs/roadmap-details.md` (7), `docs/roadmap-kb-details.md` (2), `docs/roadmap-shelved.md` (3; its ceiling rose to 21 KB for references, and the removal is expected to shrink it: re-measure and say whether `scripts/ratchet.json` L171's ceiling can drop back to 20), `docs/testing.md` (9), `docs/testing-manual.md` (3), `docs/audit/maintainer-decisions-locked.md`, `docs/planning/33-model-routing.md`, `docs/planning/37-rag-status-report.md`, `docs/planning/86-clean-up-round-three.md`, `docs/planning/assets/84-vertical-room.html`, `docs/demos/mockup-board/README.md`, `docs/demos/mockup-board/src/43b-finish-r2.js`, `docs/demos/mockup-board/src/44b-room-r2.js`, `packages/bonsai-mcp/knowledge/architecture/focus-graph-patterns.md`, `packages/bonsai-mcp/knowledge/personas/master-debugger.md`, `packages/bonsai-mcp/knowledge/policies/decky-ui-focus.md`, and the generated baselines under `docs/audit/clean-up-round-three/` (leave). `docs/demos/mockup-board-2/src/42-tabs-data.js` is a data file a test reads (edited in this lane, see above). Archives (`docs/archive/*`, 14 files) are history: leave.

## Order and clashes

- **Land read aloud before UI scale.** Both edit the same settings lines and the same Settings-tab files; this one also deletes `answerBubbleCorners.ts`, which carries 8 `uiScalePx` calls, and the 11-test block of `answerBubble.test.ts` that carries 8 more. Landing it first leaves the UI scale list 212 production calls in 15 files instead of 220 in 16.
- **Shared files** (land one helper at a time; later helpers re-find blocks by name): `main.py`, `py_modules/backend/services/settings_service.py`, `tests/contracts/settings-defaults.json`, `tests/contracts/settings-hostile-inputs.json`, `src/index.tsx`, `src/data/bonsaiSettingsSchema.ts`, `src/data/bonsaiSettingsNormalizers.ts`, `src/hooks/usePluginSettings.ts`, `src/utils/settingsPayload.ts`, `src/features/plugin-shell/tabs/useSettingsTabPayload.tsx`, `src/components/SettingsTab.tsx`, `src/features/folded-tabs/settingsTabFolds.ts` and its test, `src/components/ringTestProps.ts`, every `SettingsTab*.test.tsx` props block, `src/utils/settingsContracts.test.ts`, `src/hooks/usePluginSettings.readBack.test.ts`, `src/components/MainTabChatTranscript.tsx` (the glossary and ban lookup removals also edit it), `src/utils/buildAnswerBubbleElement.tsx` (glossary), `src/utils/replyStopRegistry.ts`, `src/styles/sections/answerBubble.ts`.
- **Glossary move:** it touches `MainTabChatTranscript.tsx` L215-219, L854-872, L895 and `buildAnswerBubbleElement.tsx` L68, L122-123, L252, L470: different lines from this list, so the two apply in either order; re-find by block name.
- **Ban lookup** shares the settings plumbing (`steamWebApiKey` rows next to ours) and `ringTestProps.ts` `developerProps`; same rule.
- **`docs/demos/mockup-board-2/src/42-tabs-data.js`** is edited by both this lane (L65-66) and the UI scale lane (L48-50): two different blocks, one file.

## The Deck check this removal needs

Own screen (the built-in panel), then the monitor if the other removals' Deck block runs there. Unload the AI before any game check (memory rule).

1. **Answer corner:** ask any question; when it finishes, the bottom-left corner is empty, Copy sits bottom-right as before. D-pad: Right from the answer's last section lands on Copy; Left from Copy returns to the answer; Down from Copy goes to Helpful (or Show details); Up from Helpful returns to the answer. Run the answer's walk with a long answer too (Copy lifts clear of the dock).
2. **Stopped and empty answers:** Stop an answer part-way; the notice and Retry/Copy still show and no speaker.
3. **Settings tab:** no "Voice replies" line (and, if UI scale has landed, no "UI scale"); open every section; walk it Down and Up; Open all button reachable from a section line; the help strip still shows each row's words.
4. **Voice input start to finish:** mic on, speak, words appear live, press Stop, the whole recording is read once and the final text replaces the live words; press Ask while still listening (asks with the final text); press X (box empties); no sound plays after the answer in any of these.
5. **Quiet after the fact:** Clear session and delete a chat with an answer showing: nothing speaks, no error toast.
6. **Old saved file:** over SSH, add `"voice_reply_mode": "always"` to the Deck's settings file (keep a copy), reopen the plugin: it loads, Settings shows no Voice replies, and the next change you save no longer writes the key. Restore only the key you changed.
7. **Free-play sweep** over the answer area.

## Open questions for the one running the session

1. **Spoiler-test names.** I left the stale "Copy and Read aloud" test and file names alone and listed renames only for the three that state a false fact. Step 5 merges those files anyway; say if you want the names fixed now.
2. **The drawing file edit.** `settingsTabFolds.test.ts` compares the Settings sections with `docs/demos/mockup-board-2/src/42-tabs-data.js`. I list the two edits to that file (and the same for UI scale). The other way is to stop the test reading the drawing for the removed sections; I prefer editing the drawing's five lines because it keeps the test doing its job.
3. **`answerReadableText.ts` leftover.** After the cut it is a 40-line table finder named for something it no longer does. Folding it into `toastAnswerPreview.ts` is a code change; I left it for step 4/5.
4. **`Left from Copy with no speaker still returns to the answer`** in `buildAnswerBubbleElement.test.tsx` sits in the deleted describe but pins a route that stays. I asked the helper to keep it; confirm.
5. **Names not pasted.** The 100 whole-file test names are given by path and count, not pasted.

## Records found wrong

Checked 50 records (the whole read-aloud digest where a record drives a cut, plus the voice, settings and answer-bubble neighbours). Wrong or incomplete:

- b13 `src/features/voice/useVoiceAskWithReadAloud.ts`, untangle: said "about 3 of these go with read-aloud". True: 4 arguments go (`clearAskCameFromMicRef`, `voiceReplyMode`, `strategySpoilerMaskingEnabled`, `settingsLoaded`), and the ref's whole chain goes too (index.tsx L244-248, L765, L775, L805, L960).
- b40 `src/features/plugin-shell/useUnifiedInputBehaviors.ts`, removal: said "none". True: L64, L79, L95 carry `clearAskCameFromMicRef` (read aloud's flag).
- b40 `src/features/plugin-shell/useSessionResetActions.tsx`, removal: said "none". True: L60, L94, L181 carry the same ref.
- b35 `src/components/useSettingsTabFocus.ts`, removal: said "none". True: L35 names `"voicereplies"`, which no longer type-checks once the section id goes.
- b15 `src/hooks/useBonsaiAskOrchestration.test.ts`, removal: said "read-aloud: none". True: L48 `voiceReplyMode: "off"` in the settings fixture goes.
- b74 `py_modules/backend/services/voice_transcription_service.py`, unused-or-twice: said `env_for_audio_capture` (L153) "goes unused when read-aloud is removed". True: `tests/test_seam_contracts.py:96` freezes it; it stays.
- b16 `src/hooks/useReadAloud.ts`, removal: left the mic-question functions' home to the reviewer. Settled: they go (their only other caller is the voice wrapper, which loses them).
- b19 `src/utils/answerReadableText.ts` / b24 `src/utils/markdownFenceReader.ts`: right, with one addition: `answerReadableText.test.ts`'s table case needs no replacement test (toast tests cover it).
- b44 `src/styles/sections/answerBubbleCorners.ts`, tests: said "none found"; its classes are also asserted in `buildAnswerBubbleElement.test.tsx` L1059-1067 (those tests are in the deleted describe).
- b43/b44 `answerBubble.ts` record said "L349 selector (delete); L350 selector (keep Copy part)": accurate, and the Copy-only selector is the third one (L351), which stays unchanged.

(Counted as wrong for the tally: the first six. The rest are corrections of detail.)
