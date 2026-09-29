# Plan 76 — release wave three: a big bug session, then an unattended Deck pass

**Status: finished 2026-09-29.** Results, the code summary and a short developer guide are [below](#results).
Asked for by the maintainer: "Let's get ready to do a massive bug fix session … once we have
the bugs fixed, do an automated QA pass with the controller rig … I hope it doesn't require me to babysit."

Part of [plan 71](71-merge-experimental-into-main.md), Stage B: the third pass of bug fixing before the last call on
**Friday 2 October**. Everything here lands on the working branch before then, so every fix must be safe to ship
this week. No reshaping of code, only fixes.

## What this session does

1. Fix the bugs chosen below, in five helpers working side by side, each in its own copy of the repo.
2. While they work, use the Deck for the measurements the D-pad fixes need, and for the owed checks that do not
   depend on this wave.
3. Land the fixes one at a time, then check every one on the Deck with the controller rig.
4. Check everything else in the roadmap's Verify list that a rig can check.
5. Keep the roadmap current after every landing and every Deck pass.
6. Anything new found along the way goes on the roadmap and into the report, and gets one honest try at a fix.

## What to focus on first

The release rule (plan 71, section 5) says a bug must be fixed before the release if a new player would hit it and
it traps them, loses their data, shows a spoiler, breaks the first ten minutes, or looks plainly broken every time.
Three groups come closest to that line, so they go first:

1. **Spoiler safety.** Two bugs found by reading the code: Copy and Read aloud can pick up a hidden block written in
   an unusual way, and a hidden block written with `~~~` and a blank line inside may be drawn half as plain text.
   Either could show or read out a spoiler. Not seen on the Deck yet, but the cause is known and the fix is contained.
2. **"Remove knowledge base?" opens with the ring on Remove.** One press of A deletes the whole library, which is a
   long download to get back. Seen on six Deck runs in a row. It comes with four smaller leftovers in the same
   boxes, where closing a box throws the ring to the tab bar.
3. **Walking down a long answer.** The ring sticks on a highlighted word for three to eight presses while the answer
   scrolls away under it — seen on every Deck run on 2026-09-28. And a section that holds only a spoiler cover
   cannot be opened when you walk down onto it; it is the last stop where walking down and walking up still differ.
   These need a Deck measurement before anyone writes a fix.

## The sort

### Fix this session

| Group | Bugs | Why now |
|---|---|---|
| Spoiler safety | Copy and Read aloud with oddly written hidden blocks; a `~~~` block with a blank line drawn half as plain text | Could show or say a spoiler |
| Boxes on the Ollama tab and the library | "Remove knowledge base?" opens on Remove; B after the library's location box or after Remove sends the ring to the tab bar; Cancel on the AI models screen with a model queued sends it to the tab rail; two more boxes found in the code that start on their action or lose the ring; nothing holds the ring when the Pull button disappears; the "Enable Tier 2 before pulling?" box talks about a reply that does not exist | A destructive default, and the ring getting lost |
| Walking an answer | The ring sticking on a highlighted word; a Down press that only scrolls leaves the ring on a cover partly off the top; a cover-only section walked Down cannot be opened; with details open, Down from "N earlier" skips the newest turn; an opened cover closing again by itself | Seen every run, or the last gap in the down-and-up walk |
| Chats and the rows under an answer | The ban lookup's row showing on the "New chat" spot; older answers losing "Was this helpful?" after a chat switch; the Session tab still showing the model's internal tag for a branch choice; "Request cancelled." still has Copy; the "nothing to sum up" pop-up's old wording; an answer ending with the previous question's choices; the reply-ready popup ending a line in a comma before "…" | Small, known or findable causes; two are known issues in the release notes that could come off |
| Back end and the library | A plugin reload stops a model download; a question about another game uses the chat's own game's notes; in Speed mode the meaning check on tips never runs; a Strategy answer's choices sometimes not understood; removing a model does not reset the 30-second memory; the wiki reader refused by Palworld's wiki | Known causes; one is a known issue in the release notes |
| Paperwork | "Copy joined two paragraphs" was fixed on 2026-09-28 but still reads as open; the design notes owe one line about the typing mark's colour | No code |

### Try once on the Deck, then decide

One try each, about ten minutes, in the first Deck block. If one shows up, it gets measured and joins a lane.
If not, the entry gets a dated "not reproduced" line and stays open.

- Down not leaving an unrevealed spoiler block; Down in carousel style landing on a chip mostly off screen; the three
  one-off focus sightings from free play; the chip ladder letting Up leave one chip at a time.
- The Context line briefly reading the wrong thing after a reopen or a game switch.
- The thin strip of answer below the game line; the "What went wrong?" block ending under the dock.
- Down from the chat row skipping the whole answer after coming back from Settings.
- Walking Down while an answer is still arriving losing the ring.
- The faded ghost of the tab bar after Show details → Session — this one gets a walk with the focus recorder, since
  it needs a measurement before any fix.

### Not this session

- **For after the release, already decided:** the three security findings (no size limit on replies from the Ollama
  address; an https address quietly sent as http; the speech model downloaded unchecked), the model tiers' licence
  labels, and the two behind-the-scenes clean-ups. Confirmed again by the maintainer for this session.
- **Watched, not chased (the maintainer's call, 2026-09-27):** Down stopping half way with Ask out of reach; the
  question box going dead over Fallout 4; a chat opened with RB while a game runs drawn as history; a writing chat not
  looking busy from another chat.
- **Accepted for 0.6.0:** the summary card behind the dock; the highlight ring looking slightly different from Steam's.
- **Too big for this week, or needs a design first:** the decode effect slowing long answers; the chat summary's odd
  wording (needs a desk test on real chats); answers borrowing each other's wording; the library's ranking bugs
  (Black Mesa's water question, wrong-subject notes, a tip found only by its own words).
- **Lives in the Deck tool, not in bonsAI:** the walk check calling a stop hidden behind a corner icon.
- **Cannot be done by the rig:** a tap outside the AI models screen (touch); a plugin reload putting Steam's Home in
  front of a game (only tried if it happens on its own — the session will not try to cause it).

## Who does what, and what runs side by side

Up to five helpers at once, each in its own copy of the repo, each owning its own files so they cannot clash. The
one running the session writes no code: it writes the briefs, reads every change before landing it, lands, and
decides anything unclear.

| Lane | What | Helper | Starts |
|---|---|---|---|
| 1 | Spoiler safety | Sonnet 5.5 high | At once |
| 2 | Boxes on the Ollama tab and the library | Sonnet 5.5 high — the maintainer's call, a trial (below) | At once |
| 3 | Walking an answer | Sonnet 5.5 high — the same trial | After the first Deck block measures the causes |
| 4 | Chats and the rows under an answer | Sonnet 5.5 high | At once |
| 5 | Back end and the library | Sonnet 5.5 high | At once |
| Deck | Measurements, owed checks, then every fix | The Deck helper (Sonnet 5.5 medium) from rows the session writes; the session reads every failure | At once |
| Rows | Collects every owed check the rig can run into one runbook | A read-only lookup helper | At once |
| Paperwork | Roadmap, testing documents and changelog, after every landing and every Deck pass | The bookkeeper (Sonnet 5.5 medium), from result lists the session hands it; every status names its evidence | After the first landing |

**What cannot run side by side:** only one thing drives the Deck at a time; lane 3 waits for its measurements;
landings go one at a time in the shared checkout; the Deck checks of this wave's fixes wait for their landings.

**The D-pad trial.** The house rule gives D-pad work to Opus. The maintainer chose Sonnet 5.5 high for lanes 2 and
3 this time. Each D-pad helper still gets the Deck's measurement in its brief — no D-pad fix is started without
one. Recorded per fix, in the same columns as the earlier trials (plan 33, section 4b): did it pass on the Deck the
first time, did the checks pass first time, what the review before landing found, rounds to land, and cost. A
D-pad fix that fails on the Deck twice goes to an Opus extra-high helper with the measurements, as the house rule
says. The earlier yardstick: Opus high passed 5 of 6 the first time (plan 74).

**Landing order:** 5 (no screen change), 1, 4, 2, then 3 last, since lanes 3 and 4 both touch the rows under an
answer. Each landing: read the change, bring it onto the tip, all checks green, bookkeeper sweep, commit.

## The Deck plan

- **Block 0, setup (10 minutes):** take the lock, keep the Deck awake, note which screen is live, save a copy of
  the settings.
- **Block 1, while the lanes build (about two hours):** the measurements lane 3 needs; the tab-bar ghost walk; the
  owed checks that do not depend on this wave (listed below); the one-off sightings, one try each.
- **Block 2, after the landings:** one deploy, then one check per fix.
- **Block 3:** anything that failed and went back for a second round; the down-and-up mirror walk; the free-play
  sweep every Main-tab change owes; then put back every setting changed and clear any pinned test chips.

**Owed checks the rig can run** (the lookup helper turns these into exact rows): a model from the first-tick picker
joining the saved try order; deleting a chat whose file is missing; the Steam settings card's two unrun checks; the
items hidden for 0.6.0, with the Developer tab off; the scramble when reopening mid-answer, and with reduced
motion; the frame rate with a game running; the reply-ready popup over a real game; the long reply that has to
continue past the length limit; the chip ladder inside the open notes block; the Session tab's branch wording (after
lane 4's fix); Down leaving an empty Session tab; reading aloud beside a running game.

**Owed checks only the maintainer can do** — left on their checks page, not attempted: the chip colour, underline
and look; the scramble's look and the frame rate's look; the tab strip's look; the kids lock with a child account;
the real microphone; Clear in the middle of an answer; the first install from the release download.

## Running without a babysitter

- **The line decides new bugs.** A new bug that crosses the release line gets fixed this session. Anything else is
  written down and gets one helper round of about an hour; if that fails, it stays on the roadmap for later.
- **A fix that fails on the Deck twice** moves up one model tier with the measurement in hand. A third failure waits
  for the maintainer.
- **Questions that come up while the maintainer is away** are written into this plan's questions list, the safest
  choice is taken for now, and the maintainer gets a phone notification only when something is truly blocked.
- **Usage limit:** every helper stops at once; each is resumed by message after the reset and keeps its work. If
  this session itself stops, a message from the maintainer ("continue") wakes it — a timed check is set as a backup,
  but it has failed before.
- **Never:** push, merge to main, switch branches in the shared folder, stage everything, or press anything on the
  Deck outside a written row.
- **Progress** is written to the log below after every landing and every Deck block, and committed, so a check-in
  from a phone shows where things stand.

## Keeping the roadmap current

After every landing: a fixed bug moves from Bugs to Verify, naming the check it owes. After every Deck pass: a pass
moves to Done with its evidence file; a failure goes back to Bugs with what was seen. The testing documents change in
the same commit. The session spot-checks each bookkeeper commit against the evidence.

## At the end

- **The report:** what was fixed and proven, what failed and why, what was found, and what is left — in plain words,
  sent to the maintainer's phone.
- **The code summary the maintainer asked for (AGENTS.md):** the files changed, how each fix works, what surprised us
  and how it was handled, and what the maintainer could have done to make the session easier.
- **The release notes' known issues** (plan 72, section 8): any line whose bug is now fixed and proven comes off.

## Questions for the maintainer

All answered 2026-09-28:

1. **The after-release items** (three security findings, licence labels, two clean-ups): still after the release.
2. **The two D-pad lanes:** Sonnet 5.5 high, as a trial. Opus extra-high only after a fix fails on the Deck twice.
3. **Deck steps allowed while the maintainer is away:** remove and reinstall the library (back to where it was);
   delete a test chat's file over SSH (a chat the session made itself); turn the Developer tab off and back on;
   launch and close games from the Recent Games row, including closing a stuck one.
4. **Other chats:** none. This session has the repo and the Deck to itself.

New questions that come up during the session go here, with the choice taken meanwhile.

## Results

**36 fixes landed on the working branch, and all checks passed at every landing. 29 Deck checks passed.** Six
helpers worked side by side in their own copies of the repo, and a seventh made one try at the D-pad trap. The Deck
ran six blocks through the night with nobody at it. Every change is on the roadmap: fixed and proven items are in
Done, and anything still owed is in Verify with the reason.

**What a player will notice:**
- Spoilers are safer. A hidden block written in an unusual way can no longer be copied, read aloud, or drawn half
  as plain text while an answer arrives.
- "Remove knowledge base?" and "Remove model" now open on "Not now". One stray A press no longer deletes a
  long download.
- The ring comes back to the button you pressed after a box closes, across the Ollama tab, the library, the AI
  models screen and the accent menu.
- Walking down a long answer, the ring no longer sits on a word or a spoiler cover that has scrolled off the
  screen. An opened cover stays open while you type. A cover can be opened from wherever the ring lands.
- "Was this helpful?" comes back after switching chats.
- The "New chat" spot no longer shows another chat's permission row.
- The Context line no longer flashes "no active game" when you reopen the panel over a game.
- A model download interrupted by a plugin reload picks up again by itself.
- A question about a game the library doesn't know no longer gets the chat's own game's notes.
- Tidy-ups: the raw "[Strategy follow-up]" tag no longer flashes after picking a choice. The reply-ready popup no
  longer ends on a comma. The "Tier 2" boxes no longer mention a reply that doesn't exist.

**Two lines can come off the 0.6.0 release notes' known issues** (done in plan 72, § 8): "Was this helpful?"
disappearing after a chat switch, and a download stopping on a plugin reload.

**The D-pad trap, now understood.** This is the rare "Down stops working" bug named in the release notes. It
happens when Quick Access is reopened over a running game and its window has not got the focus. Each press then
moves the panel's own focus while Steam's highlight stays put, and A acts on the highlight. The fix asks the
window to take the focus back. On the Deck, all six reopens after the fix came up with the window focused and no
split, where three of six went bad the night before. It also never pulled focus from the running game. That is a
strong sign, not proof: the entry stays open to watch, and whether its two release-notes lines stay is your call
(below).

**The D-pad trial (Sonnet 5.5 high instead of Opus).** 11 D-pad fixes were checked on the Deck. 10 passed the first
time. The miss was serious: walking Down past a closed spoiler cover looped, which traps the player. Neither the
helper's own tests nor my review before landing caught it, because the tests did not copy the way Steam scrolls the
page by itself. The helper's second round fixed it and passed on the Deck, with tests that now copy that scrolling.
For comparison, Opus high passed 5 of 6 the first time in plan 74. My reading: Sonnet high is good enough for D-pad
fixes whose cause is already measured, **provided** every brief asks for tests that copy Steam's own scrolling on
focus, and the session reviews for loops, not only for landing spots.

**Found tonight and filed** (all on the roadmap):
- A spoiler-cover section's top third can sit under the tab bar after a scroll. This is small.
- The popup stays up about 10 seconds instead of 8.
- Show details folds shut after switching chats or tabs. It may be by design.
- Three code-reading findings about unusual hidden blocks, none seen on the Deck.
- A stale "return the ring here" note can still be left by three Ollama-tab buttons when the parental lock is on.
- About 6.6 GB of half-downloaded model files from cancelled test downloads are left on the Deck. To clear them,
  run the command under "Calls and chores for you" below.

**Not done this session, and why:**
- Four checks can't run on this Deck:
  - It has one answering model, so the answering-model try order can't be tried.
  - It already holds eight chats, so there is no room for a test chat to delete.
  - No note is long enough to be cut for room.
  - The long reply stops by itself before the length limit.
- The Speed-mode tip check was left alone on purpose: your call from 2026-09-05.
- The Strategy menu that borrows the previous game needs a prompt change and an answer-quality run, so not this
  week.
- The rare one-off sightings that did not show up again stay open, each with tonight's dated "not seen again" line.

### Calls and chores for you

0. **The D-pad trap's two lines in the 0.6.0 release notes.** Drop them now that a fix passed 6 of 6, or keep one
   softened line until a longer play session confirms it? My lean: keep one short line for this release.
1. **The down-and-up mirror walk has one stop by design.** After a Down press scrolls past a cover, the ring sits on
   that section's box; walking Up skips the box. Fine as it is, or should Up stop there too? That needs extra rules
   for Up.
2. **The rated thumbs look the same as live ones.** After "Not really", both thumbs are switched off but not dimmed.
   A look by eye.
3. **Reading aloud beside a game:** does the game stutter? The machine numbers are fine, and it takes an eye to judge.
4. **Clear the 6.6 GB of partial downloads** on the Deck if you want the space back. Ollama doesn't list them, and
   restarting its server usually clears unused files. The session did not delete them.
5. **To unblock the four checks:** a second answering model on the Deck; one free chat slot; a test build with a
   lower reply limit (or accept the unit tests for those two rows).

## Code summary (what changed, for the maintainer)

**Spoiler safety** (lane 1, `3c4f81f7` `14d79aa4` `7a2299c5` `69544612`). A new `src/utils/markdownFenceReader.ts`
reads fenced blocks the way the panel's markdown renderer does: three or more backticks or tildes, closed only by
their own matching line. Copy (`src/utils/answerCopyText.ts`), Read aloud (`src/utils/answerReadableText.ts`), the
section cutter (`src/utils/splitResponseIntoChunks.ts`), the live parser (`src/utils/streamMarkdownPrepare.ts`) and
the live piece-splitter (`src/utils/streamMarkdownPieces.ts`) all use it now. The popup's own reader moved there from
`src/utils/toastAnswerPreview.ts`, which also drops a dangling comma before "…".

**Boxes and the ring on the Ollama tab, library and Settings** (lane 2, eleven commits).
- **Safe first:** Steam always opens a confirm box with the ring on its OK button, so "Not now" became the OK
  button and the action moved to the middle one. This covers "Remove knowledge base?" in
  `src/components/KnowledgeBaseSection.tsx`, the per-model boxes in `src/hooks/usePullModelTier2Confirm.tsx` and
  `src/hooks/usePullModelDeleteConfirm.tsx`, and "Enable Tier 2 before pulling?" in
  `src/hooks/usePullModelSubmitSelected.tsx`.
- **The ring returns after a box:** buttons register a return id in
  `src/features/plugin-shell/modalReturnFocusRegistry.ts`. `src/utils/rememberReturnWhileBoxOpens.ts` drops that note
  when no box was shown.
- **A control that disappears hands the ring on:** a new hook, `src/hooks/useHandRingOnGone.ts`, catches the moment
  React removes a control that held the ring, and passes the ring on through Steam's own transfer. It is used by
  the meaning-search Pull button and by the accent menu in `src/components/SettingsTabAccentIntensityMenuPopover.tsx`.
- **Cancel restores the licence:** Cancel on the AI models screen (`src/components/OllamaModelsHubModal.tsx`) writes
  back the licence value the screen opened with.
- **Library status survives a tab rebuild:** a module-level marker, `src/utils/kbDownloadMarker.ts`, carries "a
  download is running" across the tab rebuild that a Decky popup's close causes.

**Chats and the rows under an answer** (lane 4, seven commits).
- **The Helpful row after a chat switch:** `src/hooks/useChatSlots.ts` hands the saved newest turn back as the
  "last exchange" through `restoreLastExchangeFromSavedChat` in `src/hooks/useAskSessionSnapshotActions.ts`. The
  turn is marked as already in the thread, so the next Ask doesn't replay it.
- **The rating is remembered after a switch:** `src/hooks/useReplyFeedbackChips.ts` also stores each rating under a
  key without the request id, because a saved answer has none.
- **Smaller fixes:**
  - The Session tab's friendly branch wording, in `src/components/SessionContextStrip.tsx`.
  - The waiting lines' quote, in `py_modules/backend/services/bonsai_stream_tags.py`.
  - The raw prompt is no longer written into the question box, in `src/hooks/useStrategyBranchActions.ts`.
  - The new-chat spot hides three lines in `src/components/MainTabChatTranscript.tsx`.
  - The sum-up pop-up wording, in `src/features/chat-sum-up/`.

**Walking an answer** (lane 3, `00049cc0` `3576846c` `b2a60359` `8151dd54`).
- **Why covers closed themselves:** a cover closed when a question was typed because the answer's markdown rules
  were rebuilt on every keystroke. The explain-further callback now goes through a ref in
  `src/components/MainTabBonsaiAiMarkdownChunk.tsx`.
- **The stop rules** are in the header drawing of `src/utils/answerBubbleNavigation.ts`, with covers registered in
  `src/utils/spoilerFenceRegistry.ts`:
  - Every section is a stop.
  - Covers and underlined words inside a section are each a stop once.
  - A press that scrolls moves the ring off a stop carried out of view and onto its section.
  - The last inline stop is remembered while the ring stays in that section. This prevents the loop.
- **Tests that copy the Deck:** `src/test-harness/deckAnswerWalk.ts` models the Deck's real numbers and Steam's own
  scroll after focus, in three variants.

**Back end** (lane 5, six commits).
- **Download resume:** `py_modules/backend/services/ollama_pull_resume_service.py` (new) keeps a small note of
  running downloads and restarts them when the plugin loads. `main.py` and
  `py_modules/backend/services/ollama_local_setup_rpc.py` wire it in. A cancelled download never returns, and after
  two restarts it gives up.
- **Another game's notes:** `py_modules/backend/services/kb_other_game_named.py` (new) holds a short list of
  well-known games the library doesn't have, with everyday words left out, and `game_ai_request.py` uses it.
- **Choice menus:** `strategy_guide_parse.py` accepts the menu shapes models drift to.
- **The model memory:** `ollama_embed_service.py` clears its "is the model there" memory when a model is removed.
- **Palworld's wiki:** `scripts/fetch_wiki_live_pages.py` falls back to the plain page when Palworld's wiki refuses
  the page-render call.

**The Context line** (lane 6, `ab56e2a2`). The one status read on reopen no longer overwrites the running game.
`gameFieldsFromStatus` in `src/utils/askOrchestrationRestore.ts` prefers Steam's running app over a finished old
status. `src/hooks/useAskMountRestore.ts` marks that read.

**The trap** (lane 7, `7a7d59fe`).
- `src/utils/uiDocument.ts` gets `uiWindowMissingFocus`, which finds when the panel's own window is on screen but
  has lost the focus.
- `src/utils/navFocusRegistry.ts` asks that window for focus before every Steam transfer.
- `src/hooks/useAskBarInitialRingClaim.ts` asks again on a Quick Access reopen, up to three times.

**What surprised us, and how it was handled:**
- **Lane 3's first round introduced a trapping loop.** Tests and review both missed it. It was caught on the Deck the
  same night, and a second round fixed it with tests that copy Steam's scrolling.
- **The trap's cause surprised us twice.** The popup was first suspected, then the test tool's way of opening the
  panel. Six side-by-side reopens showed that only the window's focus decided it.
- **Lane 5's game list first held everyday words** like "satisfactory" and "don't starve", which would have dropped
  a game's own notes. I caught it in review, and 38 titles came out.
- **Lane 4's "stale choices" bug** turned out to be the prompt, not the code.
- **One slow test** (the plugin's start-up check) runs out of time when five helpers load the PC. It passes alone.
- **A landing step failed once for no clear reason** and worked on retry. The landing script now retries once.
- **I made one slip of my own:** I staged the plan file while a landing was running. I caught it before any commit
  took it.
- **The Deck tool's settings snapshot fails on this PC.** The helpers backed up over SSH instead. This is logged in
  the tool-findings list.

**What you could have done differently to make this easier:**
- Everything you did set it up well: one game on Recent Games, the Deck left free, and clear answers up front.
- A second answering model on the Deck would unblock one owed check.
- A free chat slot would unblock another.
- The Deck being on its own screen all night made the measurements consistent. Leave it that way for these sessions.

## How this plan was built (a short developer guide)

1. **Sort first.** Every open bug was sorted against the release rule (traps, data loss, spoilers, first ten
   minutes, plainly broken). Spoiler leaks, destructive defaults and D-pad walking went first. Sightings got one
   try each. Anything "after the release" stayed out.
2. **Lanes by files, not by topic.** Each helper owned a list of files, so two helpers never edited the same code.
   Where two had to share a file, the one doing focus work landed last.
3. **Measure before D-pad work.** The answer-walking lane started only after the Deck had measured the ring press by
   press. Its brief carried the real numbers: the visible band, the 80-pixel scroll step, the boxes.
4. **Land one lane at a time.** Each lane's commits were cherry-picked onto the branch by a small script. It
   rebuilds the generated files into each commit and runs the full checks after every lane.
5. **Deck in blocks between landings.** Each block checked what had just landed, plus owed checks that didn't depend
   on it, and restored every setting it changed. Rows that need a game ran last, with no plugin reload after the
   game started.
6. **The roadmap kept up after every landing and every Deck block**, by the bookkeeping helper from a written list,
   with every status naming its evidence file.
7. **A failure goes back to the same helper once with the measurement.** A second failure goes one model tier up. A
   regression that can't be fixed is reverted before the session ends.

## Log

- **2026-09-28:** draft written. The Deck was awake, no game running, its build matched this PC's, and nothing else
  was driving it.
- **2026-09-28, the go:** the maintainer said go; Deep Rock Galactic: Survivor is on the Recent Games row. All checks
  passed at the tip. Four repo copies made from `39c17312`; lanes 1, 2, 4 and 5 started. The Deck helper started
  block 1's measurements; a lookup helper is turning the owed checks into exact steps. A timed check every 30
  minutes is set as a backup in case a usage limit stops the session.
- **Deck block 1, part A (measurements):** all six measured. The ring sits on an underlined word or a cover while
  Down only scrolls, 80 px a press, until the word is off screen; a section starting with a cover is walked
  differently each way; an opened cover hides itself about 2 s after a question is typed. The tab-bar ghost and
  the "N earlier" skip did not show. Lane 3 started with these measurements (repo copy from `85af4721`).
- **The helper limit is seven from now on** (the maintainer, mid-session), committed `3f6c7e9f`.
- **Lane 1 landed** (`3c4f81f7`, `14d79aa4`, `69544612`, then its follow-up `7a2299c5` for the live answer's pieces):
  hidden blocks are read one way everywhere, `~~~` included. All checks green.
- **Deck block 1, part B:** the items hidden for 0.6.0 pass; the picture-model try order takes a new download
  last; four checks could not run (one answering model, eight chats already, no note long enough to be cut, a
  reply that stops itself early). Sightings: covers each swallow one Down (to lane 3); after picking an accent
  level nothing holds the ring (to lane 2's follow-up); six others not reproduced.
- **Lane 4 landed** (`7c9006cc`, `e5d1ceb9`, `cba792e8`, `0b2d2f9b`, `d647e4f7`). Its fifth bug is not a leftover
  in the code: the Strategy prompt makes a choice menu mandatory on a first turn, and with no game named the model
  borrowed the chat's earlier game. That is a prompt change needing an answer-quality run, so it stays open.
  One test (the plugin's own start-up check) timed out once while five helpers loaded the PC; alone it passes in
  15 s of its 20 s allowance.
- **Lanes 2, 3 and 5 landed** (D-pad trial for lanes 2 and 3, on Sonnet 5.5 high). Lane 2, seven commits: the library's and the AI models boxes open on their safe choice and give the ring back to their button. Lane 3, three commits: an opened cover stays open while a question is typed, Down and Up land on the same covers, and a press that scrolls no longer leaves the ring on something the scroll carried off screen. Lane 5, six commits, after a trim of 38 everyday titles from its game list: removing a model clears the "is it there" memory, a question about another game no longer gets the chat's own game's notes, the follow-up choice reader and the wiki reader accept more shapes, and a download running at a plugin reload starts again. Every full check green. Lane 5 left the Speed-mode meaning check alone, by the maintainer's earlier decision.
- **Deck block 2a (build `c71f1d8b`, the Deck's own screen):** six rows passed (the new-chat row, Helpful after a switch, no Copy on a
  cancelled reply, spoilers during streaming, the reply-ready popup over a real game, and by ruling the popup comma). The Session-tab
  wording failed on a 1.5 s waiting line (lane 4 again). The Context-line flash reproduced 4 of 4 (lane 6 started). With the game
  running, the ring stopped following the D-pad after the popup answer: the rare trap, now with a likely trigger; two game rows
  (SCR-10, TTS-FEAS-05) were blocked by it.
- **Deck block 2b (build `ab56e2a2`, the Deck's own screen, night of 2026-09-28/29):** 10 of 12 rows passed. Lane 2 passed first time on every row it could run; lane 5 passed both; lane 3's cover-open and glossary rows passed first time. But walking Down past a closed first cover now loops (P76-WALK-COVERS and REPLY-STOPS-MIRROR-01 failed; a regression from lane 3's first round, fixed in its second round now). Three new small findings went to lane 2's round 3: the note-search removal box opens on "Remove model", the licence setting and the AI models screen disagree after Cancel, and the library's status reads oddly for about a minute after a reinstall. About 6.6 GB of half-downloaded model files remain on the Deck (a note for the maintainer).
- **Deck block 2c (build `ab56e2a2`, the Deck's own screen, early morning 2026-09-29):** five passes (the accent ring, the library notices, the Tier 2 install wording, the branch-pick tag and the Context line). The trap was reproduced on purpose twice with a game running, with the popup shown and with the menu open, so the popup is not the trigger. Lead: both reproductions reopened the panel with the Deck tool's own "open the plugin" call (it presses Down once to place the ring); a later reopen with plain Quick Access presses kept ring and page together. Lane 3's second round and lane 2's third round landed, all checks green; block 3 running, and it tests the two reopen routes side by side.
- **Deck block 3 (build `4af8e7a1`, the Deck's own screen, early morning 2026-09-29):** the Down loop is gone (Helpful in 9 stops), and the remove-model box, the licence Cancel and the library status pass. The mirror walk has one by-design exception, left for the maintainer's call. The free-play sweep failed only on a section box 67% on screen (filed as a small bug). The stuck-ring trap follows whether the panel's window has focus, not the test tool; lane 7 is building a fix. The panel's frame rate with a game was 84.5 while an answer arrived (title screen only).

## Deck block 1, part A — measurements for lane 3

For the Deck helper. Build: whatever the Deck has now (it matches `2d65eb68`; no deploy). Before anything: check
the Deck is ready, keep it awake, save a copy of the settings, and read which screen is live (the panel's window
size). **Reuse existing chats; do not start a new chat unless a row says so** — a new chat deletes the oldest of the
eight saved ones. Questions go in with the send-question script, never A on the question box. One evidence file per
row, `docs/test-evidence/plan76-<ROW>.json`; saved walks go under `runs/`; pictures and videos stay out of the repo.
These rows are measurements: record what happens press by press. There is no pass or fail, only a clear record.

| Row | What it measures | Setup | Do | Record |
|---|---|---|---|---|
| P76-M-GLOSSARY-STICK | Why the ring sits on an underlined game word while the answer scrolls away | A finished, long Deep Rock Galactic: Survivor answer with underlined words (plan 75's chats have them). If none is saved: launch the game from Recent Games, then in an existing chat ask "What are the best overclocks and upgrades for the Scout early on" in Strategy | From that turn's question, press Down one at a time until the ring leaves the answer | After every press: the ring's element (tag, first 40 letters of its name, box), whether it is an underlined word, the chat area's scroll position and height, and the visible band (panel top to dock top). Once, with the ring on an underlined word: its ancestors up to the answer section (tag, role, tabindex, box). Which presses only scrolled; how far the word was from the next stop |
| P76-M-COVER-SCROLL | Why a Down press can only scroll and leave the ring on a cover cut off at the top | An answer with spoiler covers on its first and last sentences: in an existing chat, no game, ask "How do I beat the boss in the Soul Sanctum in Hollow Knight?" in Strategy | Walk Down through the whole answer, one press at a time | Same record as above; mark each press where the ring stayed on a cover whose top was above the visible band |
| P76-M-COVER-ONLY | Why Down lands on the section's outer box when it holds only a cover, and A does nothing | The same answer, or any with a section holding only a cover | Walk Down onto that section; A. Then walk Up onto it from below; A | Both times: the ring's element and box; the section's and the cover's tags, attributes and boxes (no text past 40 letters); whether A opened the cover |
| P76-M-NEARLIER-DETAILS | Why Down from "N earlier" skips the newest turn when details are open | A chat with at least three turns, so "N earlier" shows; the newest turn's Show details open | Walk to "N earlier", then Down one press at a time to the notes block | Every stop, in order, with its name and box. By design: Retry, question, answer parts, Hide details, then the notes block |
| P76-M-COVER-RECLOSE | Whether an opened cover closes by itself, and what sets it off | An answer with a cover | A on the cover to open it. Then every 5 s for 90 s read whether it is open, while doing: three D-pad moves inside the answer, then put a new question in the box with the script (do not send). If it stays open, send the question and watch 60 s more | The moment it went back to hidden, if it did, and what happened just before (a chip change, the question typed, the answer redrawn) |
| P76-M-TABBAR-GHOST | Whether two tab bars end up drawn at once after Show details → Session | Any answered chat | Record a 10 s video while doing: Show details, Right to the Session tab, wait 3 s, one D-pad press | How many tab bars are drawn (each one's box and opacity) right after the Session tab opens, and after the D-pad press |

At the end: put back every setting you changed, close the game if you launched it, and report per row in plain words.

## Deck block 2a — lanes 1 and 4, then the rows that need a game

Build: the tip of `experimental` after lane 4's landing, deployed at the start **with no game running**. Same rules
as block 1 (reuse chats; no A on the question box; one evidence file per row, `plan76-<ROW>.json`; back the settings
file up over SSH first). Launch Deep Rock Galactic: Survivor only after the non-game rows, and **never deploy or
reload the plugin while it runs**.

| Row | What it proves | Setup | Do | Pass when |
|---|---|---|---|---|
| P76-NEWCHAT-NO-PERM-ROW | The ban lookup's permission row stays in its own chat | Steam ban lookup off | In a chat, put `bonsai:vac-check` in the box (script), Ask, wait for the reply. LB/RB until the "New chat" spot shows; read it. Go back to that chat | The "New chat" spot shows no "Open Permissions" row and no slow-answer line; the chat itself still shows its reply |
| P76-HELPFUL-AFTER-SWITCH | The newest answer keeps "Was this helpful?" after a chat switch | Two chats with answers | In chat A ask a short question (script), wait, press "Not really" once. RB to chat B, then LB back to A. Then switch to a chat not asked this session. Then close and reopen Quick Access | Chat A: greyed thumbs and "What went wrong?" with its five chips; the other chat's newest answer shows live Helpful / Not really; **the newest answer is drawn once, not twice**; its Show details still opens and lists what it did before the switch |
| KB-FOLLOWUP-QUOTE-02 | Show details' Session tab names a branch pick in plain words | Strategy mode | Ask a first Strategy question that offers choices (e.g. "How do I beat the Soul Master in Hollow Knight?"), pick a choice, wait. Show details → Session | The row reads "I'm at: …"; "[Strategy follow-up]" appears nowhere; the turn is counted once |
| P76-CANCELLED-NO-COPY | "Request cancelled." has no Copy | — | Ask a long question, press Stop before any answer text | The "Request cancelled." bubble has no corner Copy icon (and no Read aloud) |
| P76-SPOILER-REGRESSION | Covers and answer sections still work after lane 1's fence change | Strategy, covers on | Ask "How do I beat the boss in the Soul Sanctum in Hollow Knight?"; while it arrives read the live answer every second; then walk Down through the finished answer | While arriving: no hidden words ever show as plain text (a "Spoiler hidden until complete" chip or a cover instead); finished: covers drawn, the answer cut into sections as before |
| T75-FEATURE-F1-REAL-POPUP | The reply-ready popup over a real game | Game running (launch now) | As in the owed-rows runbook, block 7 (in the scratch folder) | As written there; also note whether the second line ends in a comma before "…" (lane 1's fix) |
| TTS-FEAS-05 | Reading aloud beside a running game (machine half) | Game running | Owed-rows runbook, block 11 | Numbers recorded; no pass line |
| SCR-10 | The panel's frame rate while an answer arrives, with a game (after lane 1 changed the live drawing) | Game running | Owed-rows runbook, block 6, one answer with the scramble off | Median while the answer arrives at least 30 (the maintainer's target); record it either way |
| S5 | The Context line reading the wrong game briefly | Game running | Owed-rows runbook, S5 part (a) only | Not reproduced = the right name from the first read every time |

At the end: close the game, restore settings, empty the question box, plugin open on Main.

## Deck block 2b — lanes 2, 3 and 5

Build: the tip of `experimental` once lanes 2, 3 and 5 have landed, deployed at the start with no game running. Same
rules as block 2a. Rows marked (game) need Deep Rock Galactic: Survivor, launched after every non-game row, never with a
reload after. **A row whose "Pass when" is met on the first try counts as "passed first time" for the D-pad trial**
(lanes 2 and 3); record the first try's result even if a second try is made.

| Row | What it proves | Setup | Do | Pass when |
|---|---|---|---|---|
| P76-REMOVE-KB-SAFE-FIRST | "Remove knowledge base?" opens on its safe choice (lane 2) | Library installed | Ollama tab: Down to "Update knowledge base", Right to "Remove", A. Read the ring; A. Then open it again and press B | The ring starts on "Not now"; A removes nothing (folder and "Installed" line unchanged); after A and after B the ring is back on "Remove" |
| P76-KB-BOX-RING-RETURN | After Remove, and after B on the location box, the ring goes back to its button (lane 2) | Note where the library is installed | Remove → Right to the middle "Remove" → A. Read the ring. Then "Download knowledge base" → A → the location box → B; read the ring. Then reinstall to the same place and let it finish | After Remove: ring on "Download knowledge base". After B: ring on "Download knowledge base". The reinstall lands where it was |
| P76-TIER2-MODEL-SAFE-FIRST | "Enable Tier 2 for this model?" opens on its safe choice, and the Tier 2 boxes' wording (lane 2) | Model policy that needs Tier 2 for open-weight models | AI models screen (Browse models…): tick one open-weight model; read the ring and the box text; A | The ring starts on "Not now"; A queues nothing; the text says nothing about "this reply" |
| P76-AI-MODELS-CANCEL-RING | Cancel on the AI models screen, after the Tier 2 box, puts the ring back on "Browse models…" (lane 2) | As above | Tick an open-weight model, "Pull selected", "Not now" on the box, Right to Cancel, A. Then the same ending with Done | Both times the ring is on "Browse models…", not the tab rail |
| P76-INSTALL-OPTIONS-RING | The ring comes back to "Install options…" after a Tier 1 or Tier 2 install box (lane 2) | AI runs on this Deck | Install options… → A → "Install Tier 1 essentials" → A → B on the box; read the ring. Repeat with Tier 2; read that box's wording | Both times the ring is on "Install options…"; nothing downloads; the Tier 2 box says nothing about "this reply" |
| P76-NOMIC-REMOVE-HINT | Removing the note-search model in the plugin shows its hint at once (lane 5), and the ring is handed on when the hint's Pull button goes (lane 2) | Library on and installed | AI models screen: remove `nomic-embed-text` with the plugin's own "Remove from Deck" (read every press; this screen's rules in your agent file). Back on the Ollama tab, time the hint. Walk to its "Pull" button, A, allow the download; when it lands, read the ring; press Down | The hint shows within 5 s of the removal; when the model lands the ring is on "Update knowledge base" (or "Download…"), visible, and Down moves it. The try-order file does not list a removed model |
| P76-COVER-STAYS-OPEN | An opened cover stays open while a question is typed (lane 3) | The Soul Sanctum answer on screen | A on a cover; put "What upgrades matter most for the Nail in Hollow Knight" in the box (script); wait 10 s; read the cover; then A on it | Still open after 10 s; A hides it |
| P76-WALK-COVERS | Down and Up land on the same covers; no dead press; A opens a landed cover (lane 3) | Soul Sanctum answer, covers hidden | From the question row, Down one press at a time to Helpful; then Up back to the question. Read ring and box after every press. A on one landed cover | Down and Up visit the same stops in reverse (the one known exception: a section the ring was moved onto by a scroll can be a stop going Down only — record it); no press leaves the ring still and the panel still; every stop visible; A opens the cover |
| REPLY-STOPS-MIRROR-01 | Down and Up through a reply visit the same stops | Owed-rows runbook, block 13 | As written there | As written there, with the exception above recorded, not failed |
| P76-WALK-GLOSSARY (game) | The ring never sits on an underlined word the panel scrolled away (lane 3) | Deep Rock Galactic answer with underlined words (the first chat has one) | Down from the question word by word to the last "overclock", then keep pressing Down to the next section; read ring and box after every press | After every press the ring's box top is at y 88 or lower in the visible band, or the ring is on the answer section; reading the tall section still scrolls about 80 px a press |
| P76-PULL-RESUME | A download running when the plugin reloads starts again by itself (lane 5) | No game; room for a ~3 GB model | Browse models…: start one mid-size model; when it shows partway, `deck_reloadPlugin`; open the panel; watch. Check `pull_in_flight.json` in the settings folder during and after. Then start it again, Cancel it, reload: it must not come back. Remove the model with the plugin afterwards | After the reload the download runs again from its partial point within about 10 s; the note file exists while it runs and is gone after; a cancelled download does not come back |
| P76-OTHER-GAME-NOTES | A question about another game does not get the chat's own game's notes (lane 5) | A chat whose own game is a library game (read index.json for its game); nothing running | Ask "what are three good habits for surviving the early nights in Valheim"; read the plugin log and Show details. Then ask "what about the fourth one" | The log says the question names a game the library does not know and no library game's notes attach; the follow-up still uses the chat's own game. If no such chat exists, BLOCKED |

## Deck block 2c — lane 2's second round, lane 4's second round, lane 6; then the trap on purpose

Build: the tip of `experimental` after lane 6 lands, deployed with no game running. Same rules as 2b, including:
**read both Steam's ring and the page's focus before every A press, and act only on the ring.**

| Row | What it proves | Setup | Do | Pass when |
|---|---|---|---|---|
| P76-ACCENT-RING | After picking an accent level, the ring is back on the accent control (lane 2) | Settings tab, AI character on | Walk to the accent intensity control, A, Down to another level, A; read the ring; LB once. Then again with A then B. Restore the level | Both times the ring is on the accent control (not nothing, not "Show Developer tab"); the first LB changes tab |
| P76-KB-NOTICE-RING | After the library's download notices close, the ring goes back (lane 2) | Library installed; note-search model removed with the plugin's own "Remove from Deck" | On the hint's "Pull" button: A, then B on the notice → read the ring. A again, Download → read the ring when the model lands. Then with "Internet downloads" off: "Update knowledge base", B on the notice → read the ring. Restore the setting | Ring on "Pull" after B; on "Update knowledge base" after the download; on "Update knowledge base" after its B |
| P76-TIER2-INSTALL-WORDING | The Tier 2 install box says nothing about "this reply" (lane 2) | AI runs on this Deck | Install options… → "Install Tier 2…" → read the text → B | No mention of a reply; ring back on "Install options…" |
| KB-FOLLOWUP-QUOTE-02 | Re-run after lane 4's second round | Strategy, no game, character off | Put "How do I beat the Soul Master in Hollow Knight?" in by script, Ask, pick "B. In the City of Tears"; a page watcher reads the whole panel every 200 ms from the pick until the answer finishes | No sample holds "Strategy follow-up" — not in the waiting line, not in the question box; the Session tab reads "I'm at: …" once |
| P76-CONTEXT-REOPEN (game) | The Context line keeps the running game on reopen (lane 6) | Deep Rock Galactic: Survivor running; the last question asked with no game | Close and reopen Quick Access 5 times; each time read the Context line every 100 ms for 3 s. Then exit the game and read it for 5 s | Every read names the game; none reads "no active game detected" or another game. After exit it reads "no active game detected" within about 2 s |
| P76-TRAP-REPRO (game) | Whether a reply finishing with the menu closed over a game leaves the ring stuck | Game running; panel open; first walk Up/Down/Right from the question box and confirm ring and page focus agree at every press (baseline) | Speed mode. Put a question in by script (e.g. "give me ten tips for a new player"), Ask, then close Quick Access at once (B presses) so the answer finishes with the menu closed; wait for the reply-ready popup. Reopen the panel. Walk Down, Right, Up from the question box, reading ring and page focus after every press | Record, do not judge: does the ring stop following the D-pad? If it does, at once and without pressing A anywhere, read (1) which element holds Steam's ring and which holds page focus, (2) in the Quick Access page: `document.activeElement` and whether it is inside the plugin, (3) in Steam's shared page (target "SharedJSContext"), read-only: whatever `window.FocusNavController` exposes about the active context and its name, and the list of open windows if exposed. Then try, in order, recording each: close and reopen the panel; press the Steam button then B; exit the game |
| P76-TRAP-CONTROL (game) | The same, but the reply finishes with the menu OPEN (no popup) | Game running, relaunched fresh if the trap row left it stuck | Same question kind; keep the panel open until the answer finishes; then close and reopen; walk as above | Record whether the ring stays in step |
- **Second round landed (2026-09-28):** lane 2's three commits (the accent ring, the Tier 2 install wording, the library's notice ring), lane 4's two (the waiting lines and the question box no longer show "[Strategy follow-up]") and lane 6's one (the Context line keeps the running game on reopen). Every full check green. Deck block 2c and the trap reproduction rows are written.

## Deck block 3 — the last fixes, the trap experiment, the free-play sweep

Build: the tip of `experimental` (lane 3's second round and lane 2's third round), deployed at the start with no game
running. Same rules as before: **read both Steam's ring and the page's focus before every A press, and act only on
the ring**; never start a new chat; questions by script; no A on the question box.

| Row | What it proves | Setup | Do | Pass when |
|---|---|---|---|---|
| P76-WALK-COVERS (re-run) | Down no longer loops past a closed cover; Down and Up visit the same covers (lane 3, second round) | The Soul Sanctum answer, both covers closed | From the question row, Down one press at a time until the ring leaves the answer; then Up back to the question. Read ring, page focus, box and scroll after every press. A on one landed cover | Helpful (or the menu) is reached in about 12 Downs or fewer; no stop visited twice going Down; no press that moves neither the ring nor the panel; every stop visible; A opens the cover. Record any stop Down visits and Up does not (lane 3 says: one section box after a scroll, by design) |
| REPLY-STOPS-MIRROR-01 (re-run) | The standing mirror row | Owed-rows runbook, block 13 | As written there | As written there; the one known extra Down stop is recorded, not failed |
| P76-REMOVE-MODEL-SAFE-FIRST | "Remove <model> from the Deck?" opens on its safe choice (lane 2, third round) | AI models screen | Walk to the note-search model's row, Right to "Remove from Deck", A; read the ring; A. Check `ollama list` | The ring starts on "Not now"; A removes nothing |
| P76-LICENCE-CANCEL | Cancel on the AI models screen leaves the saved licence as it was (lane 2, third round) | Licence "Also try open-weight models" (`model_policy_tier` = `open_weight`) | Open the screen, tick gemma3:1b, set the filter to "Open source only", Pull selected, "Not now", Cancel. Read `model_policy_tier`; reopen the screen and read the filter | The file reads `open_weight` again and the screen shows the same; nothing downloads |
| P76-KB-STATUS-REINSTALL | The library's status follows a reinstall (lane 2, third round) | Library installed; note where; Internet downloads off | Remove the library; Download → the same place → "Turn on and download". Read the status line every second | "Downloading…" with a Cancel row within a few seconds, never "Not installed" during the download; "Installed" with no Cancel row within about 2 s of the end. Put Internet downloads back off |
| P76-TRAP-SPLIT (game) | Is the ring/page split caused by how the panel is reopened? | Deep Rock Galactic: Survivor running, panel open, baseline walk agreeing | **A.** Three times: close Quick Access with the Quick Access button, reopen it with the Quick Access button only (the rig's button press, NOT `deck_openPlugin`); if the plugin is not the page shown, reach it with the D-pad. Before any other press read ring, page focus and `document.hasFocus()`; then Down, Right, Up, reading both after each. **B.** Three times the same, but reopen with `deck_openPlugin`. Record what `deck_openPlugin` pressed | For each of the six reopens: did the split happen, what `hasFocus()` read right after the reopen, where the ring was before the first press. No pass line — this is the measurement the fix depends on |
| SCR-10 (game) | The panel's frame rate while an answer arrives, with a game | Only if A above showed a route with no split | Use that route; owed-rows runbook block 6, one answer, scramble as found | Median while the answer arrives at least 30; record it either way |
| TTS-FEAS-05 (game) | Reading aloud beside a running game (machine half) | Same condition | Owed-rows runbook block 11 | Numbers recorded |
| QA-FREE-PLAY-01 | The free-play sweep every Main-tab change owes | No game; a long answer on screen | Owed-rows runbook block 14 | As written there; a stop focused but not visible is a fail, except the two known corner-icon false alarms |

## Deck block 4 — the trap fix (lane 7, one try)

Build: the tip of `experimental` with `7a7d59fe`, deployed with no game running. **If part 1 shows the game losing
focus to the panel, stop at once, report, and the fix is reverted.**

| Part | What it proves | Do | Pass when |
|---|---|---|---|
| 1, safety | The fix never pulls focus away from a running game | Launch Deep Rock Galactic: Survivor. With Quick Access CLOSED, read the Quick Access page's `document.visibilityState` and `document.hasFocus()` (read only). Then open the panel, put a question in by script, Ask, close Quick Access at once; wait for the reply-ready popup; screenshot | While closed the page reads "hidden"; the game stays in front after the popup and Quick Access does not reopen by itself |
| 2, the fix | Reopening Quick Access over the game no longer splits the ring from the page | Six reopens: three with the Quick Access chord only, three with the test tool's open call. About one second after each, before any press, read `document.hasFocus()` and where the ring is; then Down, Right, Up, reading ring and page focus after each | `hasFocus()` reads true after every reopen; no split in any of the six; the ring moves with every press |
| 3, no harm | The normal path is unchanged | Close the game. Open the panel; walk Down from the tab bar to Ask and back Up, reading ring and page focus each press | They agree at every press |
