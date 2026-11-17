# Plan 105: the briefs, one per helper

How a brief is assembled: the session hands each helper `105-helper-rules.md`, the section below with its letter, the
tip hash, the absolute path of its copy, and the plan number (105). A section says: what a player sees today, where it
comes from (files and the reading behind it), what to build, the files owned, the test at the test machine's level,
and the check that proves it (the row). Evidence files are named `plan105-<ROW>.json` by the driver, never by a helper.

**Line numbers are as read at tip `d58e3155` on 2026-11-14 by six read-only lookups, not yet spot-checked by a second
reader.** Plan 104 runs before this plan, so the session re-checks every section against the tip at go (plan § 4,
first acts, step 3) and corrects it here before a helper starts. A lane that finds a line has moved re-greps and says
so; a lane that finds its brief wrong says so and stops rather than building the brief's mistake.

Model and effort per lane are in the plan's § 4 and § 5.

**Not in this file, because plan 104 holds them** (its own briefs, `104-lane-briefs.md`: G1, F1, F2, B1, B2, T3):
the low-memory warning; the ring above the pane after Show details is reopened; the "notes were used" line behind
the dock; the summed-up note's D-pad stop; the Session tab's tall card; the first-start "Install Ollama" message;
the long chat that is not summed up; the look check's "cut words" finding. If plan 104 leaves one open, the
session writes its brief here at go as lane L, from plan 104's brief and evidence.

---

## K0 — The bookkeeper's audit before anything lands (★ docs, Sonnet medium; the same brief again as K9 at the end)

One commit; every change named in your report; invent no result. You work in your own copy and are landed like a lane.

1. **Make room first.** `docs/roadmap.md` is about 95 KB against a 100 KB limit (`scripts/ratchet.json`); check the
   testing files against theirs. Move older dated sentences, word for word, to `docs/roadmap-details.md` under a new
   heading "Plan 105 notes moved from the roadmap (<date>)", each entry keeping a link, until the roadmap is at 88 KB
   or less. Move the oldest closed testing rows to the testing archive as earlier sweeps did. Nothing is deleted.
2. **Decision D142**, appended to `docs/audit/maintainer-decisions-locked.md` in the house shape of D140: plan 105 § 2
   word for word (calls 1 to 14 as answered; 15 to 28 with the answers your task names). Check 142 is free; D141 is
   plan 104's.
3. **Every entry plan 105 names, against the tip and plan 104's report.** Closed by plan 104: say so in your report so
   the session drops the lane. Still open: kept.
4. **Rewordings from planning** (plan § 8): the tab-sections bug (Terse mode is the first stop of the "Reply style"
   slider on the Ollama tab, not a switch on Settings; parts (b) and (c) re-stated against that); the "cut chip"
   entry (the look check's false alarm is plan 104's; the softer look is lane B3, from board 5); the
   focus-transfer entry (21 files, not 17 or six); the long-answer entry (following exists, in jumps; smoothness
   and the ring case are what is missing); the cut-question entry (a bottom fade exists today, always on).
5. **Intent packs:** closed as decided 2026-11-14 ("leave it quiet, close the entry"); one line in Done, the full
   entry to the archive. The delete entry keeps only its two deletions (lane E2).
6. **Headline first, Decode as the default, the four big features:** each entry gains "chosen for plan 105 (the
   maintainer, 2026-11-14)" and its call from § 2. The memory-check entry gains the maintainer's answer ("warn, with
   Ask anyway") if plan 104's sweep has not already written it.
7. **One open testing row per check in plan § 6**, named `P105-…`, each saying which machine it runs on.

## T1 — The landing step keeps its whole log (★ `[platform]`, Sonnet medium)

`scripts/land_lane.sh` lines 84 and 89 pipe the Python run through `tail -8` and, on the retry, `tail -40`; the
JavaScript test step (77, 80) and the build step (93, 97) do the same. Write each step's full output to a log file
with `tee` (a folder the script names and prints; git-ignored), then show the tail as now. A failing landing prints
the log's path. Owns: that script. Proof: a landing with a deliberately failing Python test names the test from the
kept log; put the command and its output in your report. No Deck row.

## T2 — Faster and surer checks on the test machines (★★ `[QA]`, Sonnet high)

New scripts only, under `scripts/`; you never run them against a machine.

1. **A hand-written chat on the Deck.** Saved chats live in `~/homebrew/settings/bonsAI/chat_slots/` on the Deck: one
   `<chat id>.json` per chat plus `index.json` (at most ten). The shape is cleaned by `sanitize_slot` and
   `_normalize_turn` in `py_modules/backend/chats/chat_slot_service.py` (about 341 to 481): a chat has `id`, `label`,
   `created_at`, `updated_at`, `origin_app_id`, `origin_app_name`, `label_by_hand`, `summary`, `subject`, `turns`; a
   turn has `id`, `role`, `text`, `request_id`, `app_id`, `app_name`, `created_at` and more. A hidden block is a
   ```` ```bonsai-spoiler ```` fence inside `text`. The plugin reads the file on every switch (`get_chat_slot`), so a
   placed file is drawn as written; switching to the chat that is already open does not reload it. Write
   `scripts/deck_place_chat.py`: `--host`, a recipe name or a JSON file, places the chat and its index row, prints the
   id; `--remove <id>` takes both away and restores the index byte for byte. Recipes to ship: a hidden line inside a
   bold heading, a bold bullet and a bold plain line; two covered answers in one chat; a step list; an answer with a
   notes line; a chat of 45 short turns. It refuses when ten chats exist, and never touches a chat it did not place.
2. **Wait for the answer by the log line.** Plan 104 lands `scripts/deck_ask_rows.mjs` (a whole list of questions in
   one call: type, send, wait for the log's attach line, read back, one evidence file per row). Read it first. Build
   a wait of your own only for what it does not cover (a wait with no question sent, for the D-pad rows); if it
   covers everything, say so and skip this item.
3. **The read-back on the stand-in.** `scripts/deck_kb_readback.py` is piped over SSH today
   (`ssh deck@… 'python3 - --json' < scripts/deck_kb_readback.py`). Add a local mode for the stand-in.
4. **The out-of-focus recipe** is plan 104's (its row P104-M-LOSTFOCUS). Do not rewrite it; if your task says it
   worked there, add it to the runbook fragment the session names, as a numbered step with its proof read.

The security reviewer reads the two scripts that reach the Deck. Proof: unit tests for the chat shapes against
`sanitize_slot` itself; block D0 tries each script and times it.

---

## A2 — The Show details chips in two rows (★★ `[layout]`, Opus extra-high)

**The drawing is the design:** density board, tab 1, option A of round 2 (`docs/demos/mockup-board-2/`): short names
in smaller pills ("Thought 16 s", "Spoilers: high", "gemma4:e2b"), eight in two rows (about 74 px against about 210);
no "This answer / Session" row, no "Chip 1 of 8" line; Session is a dashed chip at the end that opens Sum up this
chat; each box keeps the chip's full wording under its title; the Show details line stays.
**Where.** `src/features/answer/details/ContextChipLadder.tsx` (chips 380-435; the "Behind this answer · N of M" line
at 397), `chipLadderGrid.ts`, `chipLadderPlacement.ts`, `buildDetailsPanelElement.tsx` (the tabs row 160-320),
`SessionContextStrip.tsx`, `src/features/chats/sum-up/SessionSumUpSection.tsx`. Chip text is `chip.label` straight
from the back end, so the short names are a Python change too: `py_modules/backend/answer/transparency_service.py`
(labels at 739, 810, 814) and `src/types/inputTransparency.ts`. Session as a chip changes how the summed-up note's A
press reaches the Session view (`MainTabChatTranscript.tsx:487-492`, `focusSumUpButtonWhenMounted`) and the Session
stops in `liveTurnFocusGraph.ts:307-322`.
**Plan 104 changed this screen just before you** (its lanes F1 and F2: the reopen scroll, the caption's lift, the
summed-up note's Steam stop, the Session card's height). Read its landed commits and its Deck rows first; your
change must leave each of them passing, and your report names the rows you re-ran in tests.
**Test:** the walk with Steam's own scroll modelled, both focus states, a two-row grid, first entry and re-entry into
the chips. **Row:** P105-DETAILS-CHIPS-01. The second opinion reads the change before it lands.

## A4 — The thumbs row decodes in (★★ `[reply]`, half; Sonnet high)

Only "Was this helpful?" and its two buttons (call 6). `buildReplyActionsElement.tsx`, the thumbs at about 735; reuse
`src/features/preset-carousel/presetChipDecodeText.ts`. The row is a D-pad stop from its first frame: the ring may
land on a button that is still decoding and A must work; reduced motion shows it at once. **Row:** P105-THUMBS-DECODE-01.

## A5 — A cut question says it can be opened (★★ `[chat]`, Sonnet high)

**Chosen (2026-09-05):** the text fades at the right-hand edge only while the ring is on it; nothing for a finger.
**Where.** `src/features/answer/transcript/questionBubble.ts` (223-238) and `buildTurnHeaderElement.tsx` (257-260);
`useTitleOverflow.ts` already measures whether a question is cut. **What the lookup found against the entry:** today's
question fade is a bottom fade and is always on while the question is cut; the answer's fade class
(`.bonsai-chat-ai-bubble-inner--faded`, `answerBubble.ts:246-249`) is applied by nothing; right-edge fades exist only
on chat names (`ChatNameWords.tsx:81`) and chips (`presetChipButton.tsx:151`). The question bubble turns its own
outline off (`outline: none` at 46, 77, 103), so read block D0's look at what focus shows before you choose where the
fade sits. Two effects on one edge can erase each other: render the fade with the focus look and check the pair.
**Row:** P105-CUT-QUESTION-01, with a picture for the maintainer's eye.

## A6 — "N earlier": one game at a time, and the list flipped to group by game (★★ `[chat]`, Opus extra-high)

**The drawing is the design:** the first mock-up board, tab 1, options C and Wild of round 2
(`docs/demos/mockup-board/`). An open day starts with a row of game buttons (All, each game asked about that day, No
game); A on one shows only that game's questions, six at a time, each row carrying its game's name. Left or Right on
the "N earlier" line flips the whole list: by day, as now, or one line per game across every day, each question
stamped with its day.
**Where.** `src/features/answer/transcript/earlierTurnsByDay.ts` (`layoutEarlierByDay` 139, `groupEarlierTurnsByDay`
96), `buildEarlierList.tsx` (`dayLine` 118, the "N earlier" line 174, `earlierNav` 164), `useEarlierTurnsPill.ts`,
`EarlierListLine.tsx`, `src/shared/dpad/chatTranscriptNavHelpers.ts` (`earlierLineNavHandlers` 206, no Left or Right
yet), `MainTabChatTranscript.tsx:735, 1120` (call sites only). Each turn already carries `appName` and `createdAt`
(`src/types/bonsaiUi.ts:137, 169`); an older turn with an empty name goes under "No game". The jump from the Search
tab (`locateEarlierTurn`) must keep working in both groupings.
**Order of work:** the D-pad design on one page first (stops, chains, what Left and Right do at each stop); the second
opinion reads it (consult 2); then build. **Row:** P105-EARLIER-BY-GAME-01, plus the free-play sweep.

## A7 — At ten chats with none open, Ask shows the "pick a chat to delete" list (★★ `[chat]`, Sonnet high)

**Today.** The question goes into the newest chat with a notice (`ensureActiveSlotForAsk`,
`src/features/chats/slots/useChatSlots.ts:422-461`; the comment at 436-440 says the Ask path cannot stop to ask).
**Build.** The gate runs at the top of `onAskOllama` (`src/features/ask/flow/useBonsaiAskOrchestration.ts`, from 1028),
before the input is cleared and `setIsAsking(true)` runs at 1173; it opens the same list the + button opens at ten
chats (`useStartNewChat.tsx`). After a chat is picked and deleted the question goes into a fresh chat. On Cancel or B
nothing is sent and the question stays in the box (the session owner's safe reading; the report must say this part is
still to confirm with the maintainer). Also `askOrchestrationArgs.ts:60`, `src/index.tsx:525`. Hook order is tested
(`tests/test_ask_hook_order.py`). It replaces the newest-chat behaviour and the owed notice row P87-F2B-NO-OPEN-CHAT.
**Row:** P105-TEN-CHATS-ASK-01.

## A8 — A long answer stays in view while it writes (★★ `[reply]`, Sonnet high)

`src/features/answer/stream/useStreamScrollPin.ts`, `follow` (266-305), called from `MainTabChatTranscript.tsx:797`.
Line 303 is `anchor.scrollIntoView({ block: "end", behavior: "auto" })`; the comment at 109-116 says Steam erases
direct scroll writes and `scrollIntoView` is the only mover it adopts. Line 289 is `if (ring) return;`: the follow
stops whenever the ring is on content that scrolls, which would explain the Deck run where the page stayed at the
top. Read block D0's measurement first. A glide of your own may fight Steam's scroller; if smooth cannot be had
without that fight, fix the ring case, keep the jump, and say so. **Row:** P105-ANSWER-FOLLOW-01, with a recording.

---

## B1 — The agent chip shows the focus fill (★★ `[chips]`, Verify; Sonnet medium)

`src/styles/sections/section-6.ts:184-191` sets the agent chip's background with `!important`; the focus rule at
`src/styles/sections/section-4.ts:274` has equal weight and comes earlier, so the blue fill never shows. Add an agent
chip arm to the focus rule and a test like `presetHelpChipFocusFill.test.ts`. **Row:** CHIP-BUTTON-06.

## B2 — Decode as the default; the animation settings leave the Developer tab (★★, Sonnet high; the session reviews)

**Today.** Chips default to "fade" (`DEFAULT_PRESET_CHIP_ANIMATION`, `src/features/settings/bonsaiSettingsSchema.ts:320`);
the answer's scramble defaults to off, style `settle`, colour `green`, 400 ms (`:342-346`). The same defaults sit in
`py_modules/backend/settings/settings_service.py:212-233, 461, 494-502` and in
`tests/contracts/settings-defaults.json` and `settings-hostile-inputs.json`. The Developer "Animations" rows are
`src/features/developer/developerRowsAnimations.tsx:39-127` (five rows) with their summary in
`developerTabFolds.ts:114-179`. Saved keys: `preset_chip_animation`, `stream_scramble_enabled`, `_style`, `_color`,
`_settle_ms`, and the derived `preset_chip_fade_animation_enabled`.
**Build.** Decode for chips and the scramble for answers are simply on, with today's values as the stock values
(call 6). The five rows and their keys go; an old settings file that still carries them loads without error. The fade
and carousel chip styles are deleted (call 16): `MainTabPresetAnimatedChips.tsx` (`Inner` 381-560, the carousel
128-365), `carouselNextChip.ts` and what only they use; "static" stays as the reduced-motion look. Other files:
`bonsaiSettingsNormalizers.ts`, `settingsPayload.ts`, `usePluginSettings.ts`, `DeveloperTab.tsx`,
`useDeveloperTabPayload.tsx`, `useMainTabPayload.tsx`, `MainTab.tsx`, `MainTabPresetRow.tsx` (default prop about 139),
`src/index.tsx`, `src/test-harness/ringTestProps.ts`, the answer stream files (`streamScrambleContext`,
`ScrambledAnswerText.tsx`, `streamPace.ts`). About 25 test files change. The frame-rate floor still holds (rows SCR-09
and SCR-10: the panel drew 44 to 50 frames a second with the scramble on).
**Rows:** P105-DECODE-DEFAULT-01 (with a recording for the maintainer's eye), P105-OLD-SETTINGS-01. Consult 5 first.

## B3 — A chip's decode in step with its slide; the selected chip takes the row (★★ `[chips]`, ★ `[ui]`, Sonnet high)

**Likely cause of the pause-and-settle (not measured).** While decoding, the label is a plain clipped box
(`presetChipLabel.ts:88`); a long chip decodes its hidden tail while nothing slides; when it settles, `markResolved`
swaps in the sliding label, which waits `PRESET_MARQUEE_DELAY_S` (1.5 s) before moving; the scramble glyphs include
half-width katakana, so the width can change at the swap. Files: `presetDecodeSlots.tsx` (`begin` about 165,
`process` 176-215), `presetDecodeChipButton.tsx` (about 105-108), `presetChipDecodeText.ts`
(`PRESET_DECODE_CHAR_MS` 42, the glyph pool 57-58), `presetChipButton.tsx` (`PresetChipScrollText`),
`presetRowLayout.ts` (`presetScrollPlan`).
**The cut ends, as picked 2026-11-16:** build board 5, tab 5, **round 2's C** (`t5-2C`; open the drawing first).
While the ring is on a chip whose words do not fit, that chip widens across the row on one line so every word shows,
and its neighbours shrink to their first word and "…". No second line; the row, the chat and the question box keep
their heights. A chip that fits never changes. Chips without the ring slide as today. The change takes 0.16 s, and
none with reduced motion. Not drawn, so decide and say in the report: a chip too long for even the whole row (it
should slide inside the widened chip, as today); three chips in the row; touch (no ring, so nothing widens). The
ring must stay on the chip through the change and Left and Right must still reach each neighbour
(`src/styles/sections/section-4.ts` about 103-215 for the row; the fades in `presetChipButton.tsx`; the slide plan
in `presetRowLayout.ts`). **Rows:** P105-CHIP-DECODE-STEP-01, P105-CHIP-SOFT-ENDS-01 (now: the selected chip shows
every word, the ring holds, nothing changes height), both with a recording.

---

## C1 — First section open; sections shaded as picked (★, ★ `[tabs]`, Sonnet high)

`tabFold()` in `src/features/folded-tabs/foldedTabsStore.ts:42` starts every tab with an empty open set, and
`closeAllFoldedSections()` (88) closes all again on every tab switch (called from `useBonsaiPluginShell.ts:244`). The
store must learn each tab's first section; the unused `_sections` argument is already passed in. "First" means the
first section actually shown: the Developer tab's first section is drawn only when a seed install exists
(`developerSectionsShown`). A jump from the Search tab still opens its own target (`openSection`,
`bonsaiSettingJump.ts:106`). Many tests assume "all closed on first visit". The shading: build board 5, tab 1 as
picked, in `src/features/folded-tabs/foldedTabs.ts` (`.bonsai-fold-line` about line 100, `.bonsai-fold-body`,
`.bonsai-fold-line.gpfocus`); titles are already bold; `foldLineFit.test.ts` and `foldLineWidths.test.ts` read these
rules back. The white ring must stay clear on a shaded line. **Rows:** P105-FIRST-SECTION-01, P105-SECTION-SHADE-01
(a picture per tab), QA-LOOK-01 on every tab.

## C2 — The tab-sections bug, then sections that open by themselves (★★★ `[focus]` `[tabs]`, Opus extra-high)

**The bug.** Parts (b) and (c) date from the old Terse switch. Terse is now the first stop of the "Reply style"
slider on the Ollama tab (`src/features/ai-connection/OllamaTab.tsx`, the "reply" section 282-312;
`useOllamaTabFocus.ts`, the `chain` at 144, `focusReplyVerbosityThumb` 95). The lookup found every hop it checked
correct and no cause; the help strip (`useHelpStrip.ts`) sits in a dock outside the scroll pane and lengthens no row,
so the premise of (c) does not match the code. **Read block D0's walk before anything else** (consult 3). If the walk
is clean, the entry closes on its row and you go straight to the switch. Stale comment to fix:
`foldedTabArrival.ts:17` ("Terse mode toggle").
**The switch (the maintainer, 2026-11-11).** A new Developer switch. Walking Down, when the ring reaches the last
setting in a section, the next section opens too (two open at once); Down onto that section's first setting: both stay
open; only Down onto its second setting closes the first. The same in reverse going Up. Where: `FoldedSection.tsx`
(`moveDown` 143, `moveUp` 151, `toggle` 161), `foldedTabsStore.ts` (`toggleSection` 56), the landing watcher in
`useHelpStrip.ts:111` (it already records each landing's section). The setting: `bonsaiSettingsSchema.ts`,
`bonsaiSettingsNormalizers.ts`, `usePluginSettings.ts:147`, `settingsPayload.ts:67`, `settings_service.py`,
`useDeveloperTabPayload.tsx`, `DeveloperTab.tsx` (`rowsFor` 170), `developerRows*.tsx`, `developerTabFolds.ts`.
Opening a section in mid-walk changes the page's height under the scroll plan
(`src/shared/dpad/useTabBodyFocusScroll.ts`, `tabBodyScrollPlan.ts`): every stop must still be visible after each
press. **Rows:** P105-TAB-SECTIONS-01 (the walk on the Ollama tab, three sections open, to the Terse stop and back),
P105-SECTIONS-AUTO-01 (both directions, three tabs, every stop visible).

## C3 — A very small Text size (★ `[ui]`, Sonnet high)

Steps today: Small 0.9, Normal 1, Large 1.15 (`src/shared/text-size/chatTextSize.ts`, `TEXT_SCALE`). Add "Tiny" at
0.8 (call 17). Files: `chatTextSize.ts`; `bonsaiSettingsSchema.ts:66` (type) and `:299` (options);
`bonsaiSettingsNormalizers.ts:475`; `settingsTabFolds.ts:59` (labels); `settings_service.py:487` (the back end accepts
only the three ids today); `src/features/settings/SettingsTabChoiceRow.tsx` (a fourth button in a 300 px row: measure
that four fit, words whole). Tests: `SettingsTabChatTextSizeRow.test.tsx`, `settingsContracts.test.ts`,
`chatTextSize.test.ts`. Every font size scales (enforced by `textSizeScan.test.ts`); boxes and row heights do not.
The file's header says 0.9 "is as far down as that text stays readable"; the maintainer's ask overrides that note,
so reword it. **Row:** P105-TINY-TEXT-01, a picture of Main and of Settings for the maintainer's eye.

## C5 — Left reaches the Quick Access Menu (★★ `[focus]`, Opus extra-high)

**Today.** Left is claimed on purpose in many places because Steam's hand-off to its own rail was a shipped bug (row
LEFT-HOLDS-STILL-01): the tab bar wraps (`src/features/tabs/tabBarNav.ts:96`, `TabIndicatorBar.tsx:172`); slider knobs
claim it (`DeckFocusSlider.tsx:93, 365`); the Open all button sends it to its section line (`FoldAllButton.tsx:83`);
the ask strip's paperclip claims it (`MainTabUnifiedAskBar.tsx:586`, `chatTranscriptNavHelpers.ts:85`). Section lines
and plain switches leave Left to Steam, and nothing is measured. **Read block D0's measurement of every left edge
first.** Default rule (call 19): where Left has nowhere to go inside bonsAI, the third Left in a row that moved
nothing is handed to Steam; one shared counter in `src/shared/dpad/`; the tab bar keeps wrapping. Edge handlers on
Decky Buttons add counts to `scripts/focus-baseline.json`: do not grow it without the session's word. Consult 7
before building. **Row:** P105-LEFT-TO-MENU-01 (every tab, and LEFT-HOLDS-STILL-01 again).

---

## P1 — Terse at about 40 words, then Headline first (★ and ★★ `[reply]`, Sonnet high)

**Terse.** `py_modules/backend/prompts/reply_style_blocks.py:100-104` says "at most THREE lines… No sentence over 15
words."; the cap becomes about 40 words; the depth-loosened wording at 94-98 keeps "up to about ten" (call 18). Also
the help text in `src/features/ai-connection/ollamaTabFolds.ts:51` ("three short lines") and comments in
`replyVerbosity.ts`, `bonsaiSettingsSchema.ts:152`, `py_modules/backend/answer/terse_bare_menu.py`,
`docs/focus-graph.md:1199`. Tests: `tests/test_terse_mode_prompt.py`, `tests/test_terse_bare_menu.py`,
`OllamaTab.terseMode.test.tsx`. Nothing counts words; the cap is wording only.
**Headline first.** One clause in the system prompt: open with one short sentence that carries the point, stands
alone and gives nothing away; plain text, nothing drawn differently (call 5). The first step the roadmap's long note
asks for: count the newest answer-test run the September way (does the first sentence stand alone; does it give
anything away) for the "before". Then measure after: the same count, and facts kept, over two runs. It lands switched
on only if clearly more first sentences stand alone, none gives anything away, and facts kept stay within the test's
own noise; otherwise switched off, with the numbers, and the call is the maintainer's. The popup's two lines
(`src/features/answer/notices/toastAnswerPreview.ts`) need no change. The drawing:
`docs/demos/mockup-headline-first/`. Consult 6 before it lands switched on. **Rows:** P105-TERSE-40-01,
P105-HEADLINE-01 (three questions on the Deck, the popup read over a light game).

---

## D2 — The starter set also builds the voice engine (★★ `[voice]`, Sonnet high; the security reviewer reads it)

Plan 104's first-start fix (its lane B1) changed the same start-up files just before you; read its landed commits
first.

The starter set's arguments: `py_modules/backend/ollama/ollama_local_setup_rpc.py:140-156`; the run:
`ollama/local_ollama_setup_service.py` (`run_local_setup` 842, the speech step about 998);
`ollama/starter_speech_models.py`. The build's entry point exists: `install_whisper_cli`
(`voice/voice_transcription_service.py:258`), `voice/voice_engine_build_service.py`, `voice/voice_rpc.py`
(`install_voice_engine` 77). It needs podman (it raises if podman is missing), pulls an image from ghcr.io (900 s
limit) and runs a container build that fetches compilers (1,800 s limit). `install_voice_engine` demands the
microphone permission (`_require_microphone_access`); the starter set works with the mic off on purpose. Per call 20:
the build runs with the mic off (it only builds a program); the download box names ghcr.io before anything starts
(`src/features/downloads/downloadSites.ts`, `voiceEngineNotices` 62; `starterSetNotices`,
`localOllamaStarterSet.tsx:38`); a failed build does not fail the starter set and says the microphone step failed;
Cancel stops it. **Rows:** P105-STARTER-VOICE-01 (stand-in from a wipe; the Deck by the maintainer's hand).

## D3 — First-time setup with fewer steps, as picked (★★★ `[ollama]`, Opus extra-high)

**Today's shortest path (six presses on the drawing, counting the ring's start on "Not now" and the Close at the
end; block S0 gives the real count):** the Beta Notice, "Got it"
(`src/features/ai-connection/useDisclaimerAndLocalRuntimeGates.tsx:190-230`); "Where should the AI run?", the Deck
switch on by default, "Install Ollama" (`first-run/FirstRunWhereAiRunsModal.tsx`, `pressPrimary` 249-256); one box
that turns Internet downloads on and installs Ollama and the starter models
(`useLocalOllamaSetupFlow.tsx:128-168`). **A trap:** pressing Install before the popup's "Checking…" probe finishes
leaves `offerStarterModels` false and opens a different box with the engine only.

**Build, as picked 2026-11-16: board 5, tab 4, round 4's B (`t4-4B`). Open the drawing and press through it first.**
One first screen, top to bottom:
- *The checklist.* Five rows, one per download, each with a tick box, its size and its site: Ollama, about 1.5 GB,
  ollama.com; the answer model, about 4.3 GB, and the note-search model, about 270 MB, registry.ollama.ai; the
  speech models, about 230 MB, huggingface.co; the voice engine, about 500 MB, ghcr.io. Ollama and the answer model
  are locked on and are not D-pad stops. The other three are stops and can be unticked; the speech models and the
  voice engine tick together. The total at the top right follows the ticks (about 6.9 GB with all, about 5.8 GB
  with the least).
- *The Internet downloads switch,* in the Permissions tab's own title and description
  (`permissions/PermissionsTab.tsx:78-82`), starting off unless the permission is already on. It is the real
  permission, saved the moment it is switched, as on the Permissions tab. **Nothing turns it on but the person's own
  press.**
- *One row of three buttons:* "OK, install on this Deck", "Use the AI on my PC", "Not now". OK is grey until the
  switch is on; a press on grey OK moves the ring to the switch and does nothing else. The ring starts on "Not
  now". Down from the switch lands on OK once it can be pressed and on "Not now" before. B is "Not now".
- *One short beta line.* No Beta Notice box, no microphone switch.
OK starts every ticked download; what follows the first screen is round 1's A (the changing line and Stop on the
chat, the PC path). The "Checking…" trap must be gone: OK may not start an engine-only install.

**Left unticked.** A download the person left out must be offered where its feature is first used: the knowledge
base without its note-search model, Voice input without the speech models and the voice engine. Before changing
either place, find what it does today when its download is missing and say so in your report; if it already offers
the download in plain words, leave it and name the line. Where the starter set is offered again later (the Ollama
tab, the models box), it must not quietly install what was unticked here: say in the report how you kept the two
in step.

**The sizes** were looked up on 2026-11-16 (plan § 12 says where each came from); keep them as named constants with
the date and the source beside them, rounded as above so an ordinary new release does not make them wrong. **Put
today's totals right in the same change:** "about 4.6 GB" in `first-run/FirstRunWhereAiRunsModal.tsx:68` and
`models/localOllamaStarterSet.tsx:47` is the two models alone, and `LOCAL_SETUP_TIER1_DOWNLOAD_SIZE` ("about 4.5
GiB", `OllamaWhereAiRunsSection.constants.tsx:30`) leaves Ollama out; their tests pin the old words.

**Height:** the drawing is 392 of 454 points in a stand-in font. Measure the real box on the Deck in Steam's font
and in both languages before landing; if it does not fit, shorten the beta line or the row names, never the sites
or sizes. Keep a line saying what was left if a step is cancelled.

**Rows:** P105-FIRST-RUN-STEPS-01 (stand-in from a wipe: the press count against block S0's; grey OK; the switch
saved; each tick box and the total; one run with something unticked, then its feature's offer; the box inside the
screen in both languages), and the maintainer's own hands once.

## D4 — The Ollama tab's look, Cancel folded in, as picked (★★★ `[ollama]` `[ui]`, Opus extra-high)

`src/features/ai-connection/OllamaWhereAiRunsSection.tsx` (about 1,026 lines): Install/Update about 628; "Browse
models…" about 678; Cancel about 717-738, shown only during a setup, standing in for Install and Browse (comment at
370); Test connection 854-880 (its label shows "…" while testing); Find on LAN about 887; the found-host buttons
948-990; `OllamaTab.tsx:375-412`, the "AI models" button. Cancel calls `cancelLocalSetup`
(`useLocalOllamaSetupFlow.tsx:107`). The D-pad chain is hand-made: `cancelRowRef` 264, `focusCancelSetupBtn` 336,
the chain 370-397 and 621. The other running job with its own Cancel: the knowledge library's download
(`src/features/knowledge-library/KnowledgeBaseSection.tsx:1012-1036`); the voice install has none. **Build, as picked
2026-11-16:** board 5, tab 2, **round 2's "Elsewhere"** (`t2-2K`) for the rule and round 2's B (`t2-2B`) for the
Ollama tab's own screen; open both drawings first. Three parts as one look: (1) pressing Update or Install swaps the
buttons for one job card (what is downloading, how far, how fast, the sites, Cancel at its top right) and the ring
goes to that Cancel on the same press; (2) Test connection is a live status line of one height in every state, the
ring staying on it through the check; (3) one bar at the bottom, under the help strip, with the same words and its
own Cancel, **shown only while the card cannot be seen** (the section folded shut, the card scrolled off, or another
tab). The card never shrinks. X cancels from anywhere. When the job ends: a ring on the card's Cancel moves to
Update; a ring on the bar's Cancel returns to the row it came from; the ring is never on nothing. The raw installer
box leaves the tab; "Browse models…" turns grey with no dots while a job runs; a half-second guard stops a double
press. Build the card and the bar as shared parts that take any job, because lane D4b puts two more jobs on them;
with two jobs the bar shows the newest and a "2 jobs" chip, A on the chip switching. Drawn sizes to hold to: card
110 px, bar 56 px. Consult 8 before landing. **Rows:** P105-OLLAMA-BUTTONS-01 (start, cancel, finish, fail; the ring
read at each change; the bar present only when the card is out of sight; bar and help strip not overlapping),
QA-LOOK-01 on the tab.

## D4b — The same card and bar on the library download and the voice install (★★★ `[ollama]` `[ui]`, Sonnet high)

Starts after D4 lands; uses its shared card and bar and changes neither. Board 5, tab 2, round 2's "Elsewhere"
(`t2-2K`); open the drawing first. **The library download**
(`src/features/knowledge-library/KnowledgeBaseSection.tsx:1012-1036`, which has a Cancel today) moves onto the card,
with the site it comes from. **The voice install** on the Settings tab gets the card and its first Cancel: a stop
exists in the back end (find it from `voice_transcription_service.install_whisper_cli` and
`voice_engine_build_service.py`; say in the report what a stop leaves on disk and whether a second start picks up
cleanly). Leave a tab while either runs and the bar shows for it; come back and the bar goes. Two jobs at once: one
bar, the newest job, a "2 jobs" chip. **Rows:** P105-JOB-CARD-ELSEWHERE-01 (each job: start, leave the tab, cancel
from the bar, finish; two jobs at once; the ring read at each change).

## D5 — The AI models box: a longer list, simpler filters, as picked (★★★ `[ollama]` `[ui]`, Sonnet high)

The list is written by hand: `src/features/models/pullModelCatalog.ts` (`PULL_MODEL_CATALOG` from 119, 25 entries).
Filters: `pull-box/pullModelFilters.ts` (`FILTER_PANEL_ROWS` 124-130; 11 rows in three groups),
`PullModelsFiltersColumn.tsx`, `usePullModelTableData.ts` (`shownBesidesGoodFor` 103-127), `pullModelsBoxMemory.ts`
(defaults 34-38), `mergePullModelCatalog.ts`. "Deck essentials only" is on by default and keeps the 3 entries whose
group is "essentials". **Build:** board 5, tab 3, as picked. Every new row's size and licence comes from the model's
own public page, fetched and named in a sources list beside the catalog; no row from memory; the licence reviewer
reads the result. A model too big for a Deck is shown and marked, not hidden. **Rows:** P105-MODELS-BOX-01 (the
default view, each filter, a walk of the whole list, every stop visible).

---

## R — The review pass: security and open source, one report for the maintainer (Sonnet high, twice)

Plan § 5r is the brief. In short: at stopping point 3 the session writes the changed-file list and the whole change
since the starting tip into the workshop folder; `security-auditor` and `foss-advocate` each read them once, model
and effort passed by hand; the session checks every finding against the code and writes
`docs/planning/assets/105-review-report.md` in plain language; nothing in it is acted on until the maintainer has
read it and answered.

## E2 — Delete the avatars and the unused pack manager (★ `[repo]`, Sonnet medium)

**Avatars.** Every caller of `CharacterRoleplayEmoticon` passes `art="prop"`; only its own test draws the grid.
Delete `src/features/characters/characterPlaceholderEmoticonGrids.ts` (1,101 lines); cut the grid branch in
`CharacterRoleplayEmoticon.tsx` (about 102-165 and the import at line 9); edit its test (31-60, 74, 87-98); remove
the `scripts/growth_limits.json:24` entry; fix the comments at `characterCatalog.ts:158` and
`characterPropGlyphAppearance.ts:60`. **The pack manager** (the quiet list itself stays, call 13):
`src/features/search-tab/useIntentPacks.ts:44-57, 134-220`; `py_modules/backend/search/intent_pack_rpc.py` (44-105,
four calls); the four wrappers in `main.py` (about 1032-1049); the generated `rpcMethods.ts` (regenerate, never by
hand); `src/test-harness/fakeDeckyRpc.ts:50-54, 192-221`; in `intent_pack_service.py` `merge_import_pack`,
`export_pack`, `set_pack_enabled`, `remove_pack` and their helpers (about 366-620); the tests
`test_intent_pack_store_lock.py` and the export, remove, import and merge cases of `test_intent_pack_service.py`.
Settings search by other names (wifi, dim) must still work: a test proves it. No test-machine row; the smoke pass
covers it.

## E3 — Which bundled characters copy a real person (★★, a document; Sonnet high)

The 31 characters: `py_modules/backend/characters/ai_character_service.py` (`_CHARACTER_ROWS`, about 87-135: id, work,
label, style hint), mirrored in `src/features/characters/characterCatalog.ts`. Write one new document under
`docs/audit/`: one line per character: the work it is from, who owns that work, who voices or plays it (with the page
you read it on), and whether a voice could be a type and not a copy of that person. No code. Facts about real people
come from a page you fetched and name; where you cannot find one, write "not found". This is the document a legal
check reads before any character gets a voice.

## E4 — Two documents that do not match the code (★, ★; the bookkeeper)

`AGENTS.md` lines 163-164 say six other files call Steam's transfer directly; 21 do (the helper is `takeNavFocus`,
`src/shared/dpad/navFocusRegistry.ts:193-197`). Fix the sentence; `AGENTS.md` is at its size ceiling, so replace
words, do not add lines. Then, with block D0's reading: `AGENTS.md` 165-167 and the docstring of
`scripts/check-focus-patterns.mjs` (13-17, rule 17 at 274-293) say a Decky button never runs its own move handlers;
`MainTabUnifiedAskBar.tsx:575-586` says Left on a button is the handler Steam runs. The reading: on Main, with an
answer writing and the ring on the mode button (`MainTabUnifiedAskBar.tsx:685-704`, whose Left handler holds still
while asking), press Left and read the ring. It stays: buttons do run their Left handler. It moves to the greyed
paperclip: they do not. Correct whichever document the reading contradicts, and name the evidence file.

## F — The README clips refilmed (★★ `[docs]`; the Deck driver, a filming runbook)

The recorder's full-quality setting, the AI on the PC, 60 frames a second idle and about 33 while an answer writes
(measured 2026-10-17 on the monitor). Animated WebP at quality 90 and 30 frames a second looked best for the README.
Presses go through the rig's pad script in a background shell while the recorder runs; new wording for every retake;
Steam's performance overlay off first and back after. The clips go on the checks page; they replace today's only
after the maintainer's yes.

## E5 — The ten October notes on the checks page (the session reads them; a Sonnet high helper per request)

Plan 103's report (§ 13.1, item 7) lists them: "What?" and "I don't understand what you're trying to say" on two
items of the 10 October calls; three requests in the same round (a change to the delete-chat menu, a broken
internet sub-menu, mock-ups for smaller option boxes); the jerky scrolling; the focus ring on "How to use bonsAI"
(marked Fail; the help chip's ring passed on 2026-10-22 and the agent chip is lane B1); the decode-and-scroll idea
(lane B3); the thicker icons seen on the stand-in but not on the Deck; and "You can close it, but if needed we
will reopen it". The session reads each note off the checks page with its item, answers it on the page, and
writes a brief here for each request that is small and has a known cause. A bigger one, or one that changes a
look, becomes a roadmap entry and a drawing; it is not built this session.

## L — Whatever plan 104 left open of its six main-roadmap entries

Written at go from plan 104's report, its brief for the entry and its evidence files. Routed by the table in
AGENTS.md: a D-pad or layout entry goes to Opus at extra-high with the Deck measurement in the brief.
