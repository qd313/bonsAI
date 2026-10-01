# Plan 78, helper G: the step that runs after an answer finishes

Read-only pass. Nothing edited, staged or committed. No tests were run, and the Deck was not touched.
All proof below is from reading the code and the git history. Where a Deck run could change the
verdict, the block says so.

Short version: 4 REAL, 2 POSSIBLE. The two old breakages (the chip, the checklist) are fixed in the
paths where they were seen. The checklist fix has a twin that is still open: after the panel is closed
and opened again, the screen forgets what mode the answer was asked in (finding 1).

Where the code lives (short names used below):
- ASK = src/hooks/useBonsaiAskOrchestration.ts
- MOUNT = src/hooks/useAskMountRestore.ts
- VOICE = src/features/voice/useVoiceAskWithReadAloud.ts
- READ = src/hooks/useReadAloud.ts
- TURNS = src/utils/chatSlotTurns.ts

## Summary table

| # | Finding | Rating | What a player would notice | Captured (file:line) | Used (file:line) |
|---|---|---|---|---|---|
| 1 | After the panel is closed and reopened, the last answer is rebuilt with "Speed" mode and no attachments | REAL | A Strategy checklist that arrived while the panel was shut never appears. Refine chips then send the follow-up as Speed, without the screenshot | ASK:263-267 (default), written only at ASK:1089 | ASK:728, ASK:730, ASK:769, useReplyFeedbackChips.ts:198-200 |
| 2 | The next question puts back a thinner copy of the previous answer | REAL | After a Strategy branch pick, the next question shows that answer twice in the history until it lands. Open the older answer then and it may lack its thinking row or use the wrong game's spoiler rules | ASK:414-432 and useStrategyBranchActions.ts:100-109 | ASK:1002-1065 |
| 3 | A Strategy checklist is merged using whatever game is running when the answer lands | REAL (rare) | Quit or switch games while the answer writes: the old game's checklist appears, sometimes pre-ticked | ASK:770-776, useStrategyChecklistSession.ts:38-41 | MainTabChatTranscript.tsx:797-801 |
| 4 | The "this question came from the mic" note is written after the moment it is read | REAL on the code, not run on a Deck | With "When I asked by voice", a spoken question's answer is not read aloud | VOICE:121-125 | READ:321 via useBackgroundGameAi.ts:87-96 |
| 5 | The read-aloud setting copy starts at its default on every panel open | POSSIBLE | An answer that lands in the first moments after opening the panel is not read aloud | VOICE:96-98 | READ:324, READ:335 |
| 6 | The desktop note autosave switch is read from its first-render default after a reopen | POSSIBLE | Developer builds only: a reply that landed while shut is not autosaved | ASK:403-407 | ASK:779-781 |

## Finding 1 (REAL): the answer's mode is forgotten when the panel reopens

Sequence a player can do:
1. Set Strategy mode and ask a question in a game.
2. Close Quick Access while it writes (the normal thing to do on a Deck). The answer finishes while it is shut.
3. Open the panel again, for example by tapping the "reply ready" popup.

What happens: on every open the panel asks the back end for the last finished answer and paints it
(MOUNT:46-53). That paint reads the "mode this was asked in" from a note that is only filled in when
Ask is pressed in this same open (ASK:1089). On a fresh open it still holds its starting value, Speed
with no attachments (ASK:263-267).
- The checklist check is `askMode === "strategy"` (ASK:769). It sees Speed, so the checklist is never
  drawn or saved. The only copy on disk is from an earlier answer, if any. This is the 2026-08-27
  checklist bug again, reached by a different road.
- The Helpful row's copy of the answer gets mode Speed and no attachments (ASK:728-730). It replaces
  the better copy the saved chat had given it, because the saved-chat path backs off when one exists
  (useAskSessionSnapshotActions.ts:234). Tap a refine chip and the follow-up goes out as Speed
  (useReplyFeedbackChips.ts:200, ASK:1086) and without the original screenshot (:198). This part
  happens after every reopen, not only when the answer landed while shut.
- Smaller: the friendly caption ("I'm at: ...") is also gone on this copy (ASK:714), so the question
  line is the long internal prompt until the chat reloads from disk a moment later.

Not covered by tests: the checklist tests (useBonsaiAskOrchestration.test.ts:1616-1640) always ask in
the same open. None paints a finished answer on a fresh open.
Smallest fix: have the finished status carry the mode it was asked in (the back end already knows it),
and let a reopen paint leave mode and attachments unset instead of Speed.

## Finding 2 (REAL): the next question replays a thinner copy of the previous answer

When a question starts, the screen puts "the answer that just finished" into the history. By then the
saved chat has usually already loaded that same answer, so the code swaps the loaded row for its own
copy (ASK:1046-1063). That copy was captured when the answer landed (ASK:414-432). It is poorer than
the loaded row, and it can be wrong. Four effects:

a) Duplicate row (visible without opening anything). Sequence: Strategy mode, pick a branch button,
   wait for the follow-up answer, then ask anything. While the next answer writes, the branch answer
   is listed twice. The screen's copy keeps the caption "I'm at: ..." (ASK:714, ASK:721). The saved
   chat keeps the long prompt as the question (TURNS:98). The "is this the same turn already loaded"
   test compares those two texts (ASK:1048-1051), says no, and adds a second row. Same for a tapped
   glossary word. It clears when the next answer lands and the chat reloads. Existing tests use the
   same text on both sides (useBonsaiAskOrchestration.test.ts:1448-1520), so they cannot see it.

b) Lost thinking row, caption and summary note. The copy has no thinking, caption or summary mark
   (types/backgroundAsk.ts:239-255), the loaded row does (TURNS:101, :118, :122). Visible only if the
   player opens the older answer during the wait.

c) Branch pick makes it thinner still. A branch pick stages its own copy with only question, answer
   and chat (useStrategyBranchActions.ts:103-107): no game, no named boss, no spoiler consent, no
   Show details data. This is last night's "cover comes back after spoilers are okay" symptom, still
   possible on the older row for the length of the follow-up. Same condition: older answer opened.

d) Game switch re-stamps the answer. The stamp effect lists the running game's id as a trigger
   (ASK:432), so when the game changes between two questions it runs again and writes the NEW game's
   id (ASK:426). The type note says this must never happen (types/bonsaiUi.ts:109-114). Visible harm
   only going from a story game to a no-story game, because an id in the no-story list beats the
   name when the spoiler profile is chosen (data/spoilerTitleProfiles.ts:140-148): the older answer's
   covers can open. It also wipes the Show details data stamped a moment after landing.

All four heal when the next answer lands, because the chat reloads from disk. The saved row now carries
game, entity, consent and thinking, so the replay is no longer needed for those.
Smallest fix: leave the loaded row alone, and add the staged copy only when no loaded row has the same
answer.

## Finding 3 (REAL, rare): a checklist is merged with the wrong moment's game

Sequence: Strategy mode in game A, ask, then quit A or start game B before the answer lands. The answer
lands with a checklist. The screen takes the game id from the answer (ASK:770) but the name from the game
running now (ASK:773), and merges the new list into whichever checklist is on screen right now
(ASK:771, ref at useStrategyChecklistSession.ts:38-41). That ref was loaded for game B or for none
(useStrategyChecklistSession.ts:69-71). The panel has no "is this still the running game" test
(MainTabChatTranscript.tsx:797-801). The player sees game A's checklist under the answer while no game,
or another game, runs. Item ids are plain "1", "2", "3", so ticks from the other game's list can carry
across (strategyChecklist.ts:75-98). The saved copy gets an empty name, but no screen shows the name.
Smallest fix: draw the new checklist only if the answer's game is still the running game; still save it
under the game it was for.

## Finding 4 (REAL on the code; needs a Deck run with the mic): the voice note arrives too late

Sequence: Settings, Voice replies = "When I asked by voice". Ask by pressing the mic. The answer lands.
It should read itself aloud. The note "this came from the mic" is saved by an effect that runs after the
screen redraws with the request number (VOICE:121-125). The request number is only learned when the
answer finishes (ASK:668; pending polls return before it, ASK:581). The poll reads the note straight
after painting, in the same breath, with no redraw in between (useBackgroundGameAi.ts:87-96, then
READ:321). If the panel batches its updates (React 18 does; this build uses a React 18-only call in
CharacterPropGlyph.tsx:135), the note is not there yet, so the question counts as typed and nothing is
read. The background watcher does the same (utils/bonsaiAskCompletionWatch.ts:59-61). The comment in VOICE
says the number is "set from every poll"; it never was, even in the commit that added it (09464bc0f).
The unit test writes the note by hand first (useReadAloud.test.ts:359), so it cannot see this. The Deck
row is still owed (docs/testing.md:309, READ-ALOUD-05). "Always" and "Off" are not affected.
Smallest fix: write the note when Ask is pressed (the start call hands back a request number), or read
it from a ref, not from an effect.

## Finding 5 (POSSIBLE): the read-aloud setting copy resets on every open

The two settings the finish step reads live in module-level variables (READ:239-240), refreshed by an
effect (VOICE:96-98). A fresh open runs that effect with the starting values (Voice replies Off) before
settings load, so for that moment the copy says Off. If the answer finishes inside that window (the
back-end watcher runs on its own), it is not read, and it is never retried (READ:314-319 marks it
handled). A tiny window, and the reply-ready popup path cannot hit it. No visible effect I can name
beyond "an answer that lands within a moment of opening". Smallest fix: skip the update until settings
have loaded.

## Finding 6 (POSSIBLE, developer builds only)

`desktopAutoSavePrefsRef` starts from the first render's values (ASK:403-407) and is refreshed by an
effect after settings arrive. The reopen paint of a finished answer can run first (ASK:779-781), so the
autosave is skipped and, because the answer is then marked handled elsewhere, not retried. Only builds
with the desktop debug note autosave on. Smallest fix: none needed for the Deck.

## Last night's two fixes, read for the same fault

- "Run AI on this Deck can show ON without being saved" (6614e8896): FINE. `persistChangedSettingsNow`
  reads the two settings refs after its short wait (usePluginSettings.ts:358-374). The snapshot ref is
  assigned in the render body (usePluginSettings.ts:248), so it equals the render that turned the switch
  on. The notice's code reads the helper through a ref (useDisclaimerAndLocalRuntimeGates.tsx:131-133,
  :188-190) that an earlier effect in the same commit has already refreshed, and index.tsx:724 builds
  the call fresh each render. One gap, not a stale copy: if that save call fails, the restore after the
  notice still treats the on-screen ON as saved. Same family as the open roadmap entry about a change
  made under half a second before the panel closes.
- "After spoilers are okay the answer gets a cover back" (57d50b604): FINE for the plain Ask. The loaded
  row now reads the saved flag (TURNS:114), and the staged copy carries it (ASK:429, :1060). It is not
  fine on the branch-pick road, see finding 2c.

## Read and cleared (nothing stale, or refreshed in a way that holds)

- The chip pick (06e9c83b): the after-answer reseed now goes through one stable function that always
  runs the newest version (useSuggestedPromptChips.ts:165-171), and the row also drops the "Enable local
  knowledge base" chip when the setting is on (:177-183). One leftover: a reseed fired by the reopen
  paint can run before settings load and use the Off copy, but the cold-open reseed that waits for
  settings (:185-199) draws again afterwards, so nothing lasting. Two reseeds in flight can land in the
  wrong order; the window is one search call, so I left it.
- The held copy of the answer-painting function inside the poll loop (useBackgroundGameAi.ts:75-122).
  It reads four things from the first render's arguments: the active chat pointer (a ref), "chat
  generating" (a stable callback, useChatSlotActivityState.ts:68-75), "chat has an unread answer" (a
  state setter) and "reload the chat" (goes through a ref refreshed every render, index.tsx:561-563,
  :586). All four are safe to hold.
- The poll error handler (rebuilt every render); the Stop handler (reads refs assigned in the render
  body); the reopen paint's own ref (refreshed every render, MOUNT:40-41).
- The streaming flag read at finish (an effect-updated ref, but it was set long before the finish).
- The checklist ref lag (effect-updated, ASK:769-777): nothing reads it inside the lag.
- The checklist tick handler (a functional update); the ban-lookup row (judged each render from the
  live text or the newest saved answer, MainTabChatTranscript.tsx:1065-1067); the Read aloud button (rebuilt
  each render, :431-455).
- The reply-ready popup (bonsaiReplyReadyToast.ts, bonsaiReplySurface.ts:43-49: the "is the reply on
  screen" flag clears on unmount) and the background watcher's own counter guard.
- The Helpful row's rating memory (keyed by request, question and answer; useReplyFeedbackChips.ts:76-122).
- The Sum up job's finish callback (kept in a ref, useChatSumUpJob.ts:66-67).
- The chat reload after an answer (useChatSlots.ts:224-246): it reads the active chat before its wait
  and applies after it. A chat switch inside that one call could paint the old chat for a moment. The
  window is one local call, so I left it.
- The Show details refresh, the game-name sync, the chip rotation timer (its effect lists the knowledge
  base setting, MainTabPresetAnimatedChips.tsx:293), and the "explain further" callback in the memoised
  markdown chunk (read through a ref).

## Noticed in passing (not a stale copy, no rating)

When a different chat's answer finishes, the reload that follows (ASK:807) rebuilds the chat you are
looking at and points its open turn at the newest one (useChatSlots.ts:190). If you were reading an older
answer in that chat, it collapses.
