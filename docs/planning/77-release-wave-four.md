# Plan 77 — release wave four: the last bug session before Friday, then an unattended Deck pass

**Status: planned 2026-09-29, not started.** The maintainer's calls for it are in [Decisions](#the-maintainers-calls-2026-09-29).

Asked for by the maintainer: "Let's get ready to do a massive bug fix session as a follow-up from last night …
once we have the bugs fixed, do an automated QA pass with the controller rig … I hope it doesn't require me to
babysit."

Part of [plan 71](71-merge-experimental-into-main.md), Stage B: the fourth and last pass of bug fixing before the
last call on **Friday 2 October**. Everything lands on the working branch, so every fix must be safe to ship this
week. Fixes only, no reshaping of code.

## What this session does

1. Fix the bugs chosen below, with up to **ten helpers at once**, each in its own copy of the repo.
2. While they work, use the Deck for the checks that do not wait on this wave, a long play test over a game for last
   night's D-pad trap fix, and the chores the maintainer allowed.
3. Land the fixes one at a time, then check every one on the Deck with the controller rig.
4. Check everything else in Verify that the rig can check.
5. Keep the roadmap current after every landing and every Deck pass.
6. Anything new found along the way goes on the roadmap and into the report, and gets one honest try at a fix.

## Where things stand

Last night (plan 76) fixed 36 bugs and passed 29 Deck checks, so the Bugs list is much quieter. What is left:

- A handful of small bugs with a known cause. These are the work.
- Six items that were parked until after the release. The maintainer has now pulled in four of them: the three security
  fixes and the model licence labels. The two clean-ups behind the scenes still wait, because they reshape code.
- About a dozen one-off sightings that did not come back when tried again on purpose. By the maintainer's call these
  move to a watch list (see [the tidy-up](#the-tidy-up-of-the-bugs-list)).
- Checks in Verify that were blocked last night and can run now, because the maintainer allowed the Deck chores that
  unblock them.

## What to focus on first

The release rule (plan 71, section 5): fix before the release anything a new player would hit that traps them, loses
their things, shows a spoiler, leaks something private, breaks the first ten minutes, or looks plainly broken.

1. **The D-pad trap, proven over a long play session.** Last night's fix passed 6 of 6 reopens over a game. It is the
   biggest release risk left, and the rig can test it for an hour with nobody at the Deck. The result decides the two
   known-issues lines in the release notes.
2. **Spoilers.** Three edge cases found by reading the code. A hidden block glued onto a sentence is drawn as visible
   text. Read aloud reads one kind of code block out as words. The back end's spoiler safety net misses one way of
   writing a block. None seen on the Deck, but showing a spoiler is on the release line.
3. **Security.** Replies from the Ollama address with no size limit; an https address quietly sent as plain http; the
   speech model downloaded unchecked. All three are small, but the size limit touches how answers stream in, so it gets
   the most careful checks.
4. **Walking an answer.** The spoiler section whose top third sits under the tab bar after a Down press, and (the
   maintainer's call) Up stopping on the same box Down does, so both directions visit the same stops. This is why the
   free-play sweep fails, and every Main-tab change owes that sweep.
5. **Small leftovers** with known causes: the licence labels, three Ollama-tab buttons, the ban-lookup row, Helpful on
   a stopped answer, the popup's timing, and a Strategy answer borrowing the last game's choices.

## The sort

### Fix this session

| Helper | Bugs | Why now |
|---|---|---|
| A. Spoilers on screen | A hidden block's opening mark glued onto a sentence is drawn as visible inline code; Read aloud reads a `~~~` code block as words | Could show or say a spoiler |
| B. Replies from Ollama | A size limit on every reply read from the Ollama address, including the stream; the back end's spoiler safety net learns `~~~` blocks | Security finding 6; spoiler safety net |
| C. Addresses and downloads | An https address is refused with a clear message, not sent as http; the speech model is pinned to one exact file, checked and size-capped; a library file list with no checksums is refused | Security findings 7 and 8 |
| D. Licence labels | Each model's licence label checked against its own page and put right; the tiers' wording in the README and troubleshooting guide to match | Labels only, the maintainer's call 2026-09-28 |
| E. Walking an answer | The spoiler section's box a third under the tab bar after Down; Up stops on that box too | The free-play sweep fails on it; the maintainer's call on Up |
| F. Ollama-tab ring | "Update AI & models" and the Tier 1 and Tier 2 install buttons can leave a stale "return the ring here" note when the parental lock is on | The same fix as last night's library buttons, three more places |
| G. Chats and answer rows | A chat's own ban-lookup row is gone when you come back to it; a stopped answer or a saved error gets live Helpful buttons after a chat switch; the reply-ready popup stays up 10 seconds, not 8 | Small, known causes |
| H. Strategy prompt | A Strategy question about the Deck itself borrows the chat's last game for its choice menu | Needs an answer-quality run, which this session can do while the Deck is free |

### Closed by the maintainer's call, no code

- **Show details folds shut after a tab or chat switch:** fine as it is. Closed as working by design.

### The tidy-up of the Bugs list

By the maintainer's call, one-off sightings that did not come back when tried on purpose move to **Shelved** with the
tag `[watching]`. Each line says "unshelves on a new sighting." The full entries go to the shelved archive, nothing is
deleted. The list, to be confirmed against the file by the bookkeeper:

- Down not moving off an unrevealed spoiler block (the never-moves form).
- Down in carousel style landing on a chip mostly off screen.
- The two free-play focus sightings still open (the accent one is fixed).
- The chip ladder and the two confidently wrong answers (the ladder measured one chip per press both ways).
- With details open, Down from "N earlier" skipping the newest turn.
- The thin strip of answer below the game line.
- Down from the chat row skipping the answer after coming back from Settings.
- The "What went wrong?" block ending under the dock.
- Walking Down while an answer is still arriving.
- A chat opened with RB over a game drawn as history.
- A writing chat not looking busy from another chat.
- A tap outside the AI models screen (touch, cannot be reproduced by the rig).
- The meaning search once taking a second with a game running.

The panel stopping half way with Ask out of reach also moves to the watch list, and is linked to the trap fix, which
is most likely the same family. The tab-bar ghost after touching the screen goes to the maintainer's checks page,
since only a finger can test it.

### Not this session

- **After the release:** the two clean-ups behind the scenes (reading the after-answer step for stale copies, removing
  the unused live-line trimming code).
- **Too big for this week, or needs a design first:** the decode effect slowing long answers; the chat summary's odd
  wording; answers borrowing each other's wording; the library's ranking bugs (Black Mesa's water question,
  wrong-subject notes, a tip found only by its own words).
- **Lives in the Deck tool, not in bonsAI:** the walk check calling a stop hidden behind a corner icon.
- **Cannot be done by the rig:** a plugin reload putting Steam's Home in front of a game (only noted if it happens on its
  own).

## Who does what, and what runs side by side

The one running the session (Opus) writes no code. It writes the briefs, reads every change before landing it, lands,
writes the Deck rows, reads every failure, and decides anything unclear.

| Who | What | Model | Starts |
|---|---|---|---|
| Helper A | Spoilers on screen | Sonnet 5.5 high | At once |
| Helper B | Replies from Ollama | Sonnet 5.5 high | At once |
| Helper C | Addresses and downloads | Sonnet 5.5 high | At once |
| Helper D | Licence labels | Sonnet 5.5 high (it must read each model's page and judge) | At once |
| Helper E | Walking an answer | Sonnet 5.5 high, with last night's Deck measurements in its brief | At once |
| Helper F | Ollama-tab ring | Sonnet 5.5 medium (the same pattern as last night's fix) | At once |
| Helper G | Chats and answer rows | Sonnet 5.5 high | At once |
| Deck driver | The Deck rows, one at a time | Sonnet 5.5 medium | At once |
| Runbook | Collects every owed check the rig can run into one list of exact rows | A read-only lookup helper | At once, finishes early |
| Helper H | Strategy prompt | Sonnet 5.5 high | When the runbook helper finishes |
| Bookkeeper | Roadmap, testing documents, changelog | Sonnet 5.5 medium | After the first landing |

That is ten at once at the start, and the runbook helper's slot goes to helper H. A finished helper's slot goes to
the next job: a second round, or a fix for something new.

**What cannot run side by side:**
- Only one thing drives the Deck at a time.
- The answer-quality run for helper H uses the Deck's own model, so it runs only while the Deck driver is idle.
- Landings go one at a time in the shared checkout; the bookkeeper does not commit while a landing runs.
- Helpers A and E both touch the answer's drawing, so E lands last.
- The Deck checks of this wave's fixes wait for their landings.

**D-pad work on Sonnet high.** The house rule's condition from last night applies: helper E's brief asks for tests that
copy the way Steam scrolls the page by itself on focus, and the review before landing looks for loops, not only for
where the ring lands. A D-pad fix that fails on the Deck twice goes to an Opus extra-high helper with the measurements.

**Landing order:** B, C, D (no change to the Main tab), then H after its answer-quality run, then A, G, F, and E last.
Each landing: read the change, bring it onto the tip, all checks green, bookkeeper sweep, commit.

## The Deck plan

**Block 0, setup (10 minutes).** Take the lock, keep the Deck awake, note which screen is live, save a copy of the
settings, and confirm the build on the Deck matches the tip.

**Block 1, while the helpers build (about three hours):**
1. The chores the maintainer allowed:
   - Restart Ollama to clear the 6.6 GB of half-downloaded files. Free space is read before and after.
   - Pull a second small answering model, so the answering-model try order can be checked.
   - Delete the oldest of the maintainer's eight chats, to free a slot for the missing-chat-file check. Its title is
     written in the log first.
2. **The long play test for the D-pad trap fix.** A game from Recent Games, about an hour: reopen Quick Access twenty
   or more times with D-pad walks and a question in between. At each reopen, record whether the panel's window has
   the focus and whether the ring and the page split. It passes only with no split at all.
3. The owed checks that do not wait on this wave:
   - The Strategy choices being understood, with a game running, reading the log.
   - Deleting a chat whose file is missing.
   - A model from the first-tick picker joining the saved try order.
   - The chip ladder inside the open notes block.
   - Whatever else the runbook helper finds.
4. **A test build with a low reply limit**, made by the session on a throwaway copy and never committed. It runs the
   two blocked checks: the long reply that must continue past the limit, and a note cut for room. Then the normal build
   goes back on.

**Block 2, after the landings:** one deploy, then one check per fix. The size limit gets extra checks: a long answer
still arrives whole, the library still finds notes, and the model list still loads.

**Block 3:**
- Anything that failed and went back for a second round.
- The down-and-up mirror walk (Up now stops on the box).
- The free-play sweep every Main-tab change owes.
- The answer-quality run for helper H, if it did not fit earlier.

Then put back everything changed: settings, the normal build, the second answering model removed, and any pinned test
chips cleared.

**Only the maintainer can do these, so they go on the checks page and are not attempted:** the chip colour, underline
and look; the scramble's look; the tab strip's look; the kids lock with a child account; the real microphone; Clear in
the middle of an answer; the first install from the release download; the rated thumbs' look; whether reading aloud
makes a game stutter; the tab-bar ghost after touching the screen.

## Running without a babysitter

- **The line decides new bugs.** A new bug that crosses the release line gets fixed this session. Anything else is
  written down and gets one helper round of about an hour. If that fails, it stays on the roadmap for later.
- **A fix that fails on the Deck twice** moves up one model tier with the measurement in hand. A third failure waits for
  the maintainer.
- **Questions that come up while the maintainer is away** are written into the questions list below. The safest choice
  is taken for now, and the maintainer gets a phone notification only when something is truly blocked.
- **Usage limit:** every helper stops at once and each is resumed by message after the reset, keeping its work. A
  20-minute timed check wakes this session if it stops. A message from the maintainer ("continue") also wakes it.
- **Never:** push, merge to main, switch branches in the shared folder, stage everything, or press anything on the Deck
  outside a written row.
- **Progress** is written to the log below after every landing and every Deck block, and committed, so a check-in from
  a phone shows where things stand.

## Keeping the roadmap current

After every landing, a fixed bug moves from Bugs to Verify, naming the check it owes. After every Deck pass, a pass
moves to Done with its evidence file, and a failure goes back to Bugs with what was seen. The testing documents change
in the same commit. The session spot-checks each bookkeeper commit against the evidence.

## At the end

- **The report:** what was fixed and proven, what failed and why, what was found, and what is left. Plain words, sent to
  the maintainer's phone.
- **The code summary:** the files changed, how each fix works, what surprised us and how it was handled, and what the
  maintainer could have done to make the session easier.
- **The release notes' known issues** (plan 72, section 8): any line whose bug is now fixed and proven comes off. The
  trap's two lines follow the long play test.
- **The checks page** gets every new check only the maintainer can do.

## The maintainer's calls, 2026-09-29

Written up as D120 in the locked decisions file ([D120](../audit/maintainer-decisions-locked.md)); D120 was free.

1. **Pulled in from after the release:** the three security fixes and the licence labels. The two clean-ups stay after
   the release.
2. **Helpers:** Sonnet 5.5 high for the D-pad, spoiler, security and judgment work; medium for mechanical fixes, the Deck
   driver and the bookkeeper. Up to ten helpers at once for bug and feature work (was seven).
3. **One-off sightings** not seen again when tried on purpose move to a watch list in Shelved.
4. **The Deck, while away:** everything allowed last night, plus: delete the oldest of the eight chats; restart Ollama to
   clear the partial downloads; pull a second small answering model and remove it afterwards; a throwaway test build with
   a low reply limit.
5. **An https Ollama address:** refuse it and say so.
6. **Walking up a reply:** Up stops on the section's box too, so both directions visit the same stops.
7. **Show details folding after a tab or chat switch:** fine, by design.
8. **The D-pad trap's release-notes lines:** decided by the long play test. Clean, and they shrink to one short line.
   A trap, and they stay.

### Questions that come up during the session

New ones go here, with the choice taken in the meantime.

1. **Two of the default models are not open source by their makers' own pages.** The default picture model and the
   second text model in the default tier (both Qwen 2.5 at the 3B size) carry Qwen's "Research" licence, which is
   not an open-source licence. Ollama's own page for the picture model shows Apache 2.0 instead, so the sources
   disagree. Moving them out of the open-source group would change what the default tier picks, which is more than
   "labels only". **Meanwhile:** they stay where they are in the tiers and the try order; only the licence text on
   screen and in the README is corrected. **Your call:** keep them in the default tier with the honest label, or
   move them and pick other defaults (after the release).
2. **Should a Strategy answer ever pick up the game from earlier in the chat?** Helper H's fix covers questions about
   the Deck itself (the overlay, Quick Access, desktop mode and the like): those no longer get another game's choice
   menu. It did not add a wider rule ("no game running and none named: never use an earlier game"), because a bare
   follow-up like "how do I beat the second boss" relies on the chat's game on purpose. **Meanwhile:** the narrow fix
   only. **Your call, after the release:** whether the wider rule is wanted.

## Results

Not started.

## Log

- **Start (2026-09-29, tip `7fa69d40`):** eight helpers started in their own copies of the repo (A to H), plus the
  checks-list helper and the Deck driver: ten at once. The Deck driver runs setup and then the long play test for
  the D-pad trap fix. A 20-minute timed check is set as a backup restart. Helper IDs, for resuming after a usage
  limit: A `aaa5ecf700267ab19`, B `a50546f4a20aff52b`, C `a52b27d2db8f3c4f6`, D `a74640dc38e8c5acd`,
  E `a43dca60f5a93a5bd`, F `afc0c2789beb97720`, G `a7c09606b12abec40`, H `a41e60ce70cd50608`,
  checks list `a9a172a6800e9156a`, Deck driver `a9fe30acdd9673598`.
- **Bookkeeping:** the watch list, the Show details call and D120 written (`9ffe9354`).
- **Landed:** helper G (the ban-lookup row, Helpful on a stopped answer; tip `03baaa45`), helper F (the Ollama-tab
  ring note; `7c8ac206`), helper B (reply size limits, the `~~~` safety net; `044069cd`). Every check green at each.
  Helper G found the popup timing is probably not a bug: the code sets 8 s and an earlier video measured 8 s drawn;
  last night's reading counted the text left in the page while it faded. A video check decides it.
- **Helper H finished** (the Strategy prompt for questions about the Deck itself). Its answer-quality run is going on
  this PC's own copy of the Deck's model, so it does not compete with the Deck.
- **All eight helpers landed (tip `5578656c`), every check green at each landing.** D (licence labels), C (https
  refused, speech model pinned, library list needs checksums; one clash with B's change in the same file, resolved
  by hand), H (Strategy about the Deck itself), A (glued hidden block, Read aloud and `~~~` code), E (the D-pad walk:
  every landing on screen, Up stops on the box too). Two one-off test timeouts under load, both green on the next
  full run.
- **Helper H's answer test** (the PC's copy of the Deck's model, 2026-09-29): the old bug (a Deck question picking up
  Hollow Knight's choices) never happened in 30 tries before or after, so this run cannot prove the fix. It did no
  harm: ordinary game questions kept their menu (14 of 15). The Deck check is the real test.
- **Helper D round two** started: three screens still say "FOSS" for the default model, wording only.
- **The long play test for the D-pad trap fix PASSED** (block 1a): 24 reopens over a game, the panel's window had the
  focus every time, no split in 72 presses, 6 of 6 walks reached Ask. The trap entry moved to Done, and the release
  notes' two D-pad lines became one short line (D120 #8). New and small: in 12 of the 24 reopens Steam's ring was not
  drawn for the first second; the first press brought it back every time. **Helper I** (`a38f2e52ccc62cc2d`) read the
  code and changed nothing: the trap fix is not involved; the likely cause is Steam not redrawing its ring after the
  test's own plugin reload over the game. Two Deck reads in block 3 decide whether it is real.
- **Helper D round two landed** (`de74af02`): the install buttons say what they install ("Install Gemma 4 (all-in-one
  model)"), and "FOSS" is gone from the setup boxes.
- **Deck block 2 (build `bce7d0fd`):** passed — the Strategy choices being understood with a game running (8 of 8), the
  reply size limits, the `~~~` safety net, the ban-lookup row after a switch, no Helpful on a stopped answer after a
  switch, the speech model, Strategy about the Deck itself, the Ollama-tab boxes' return (box half), and the popup
  (7.87 s drawn, so the "10 seconds" was never a bug). The walk: every landing on screen and Up and Down visit the
  same stops, but Down takes an extra scroll-only press between sections, and Up into a section taller than the
  screen shows neither edge — both back to helper E (round 2). The model list still shows "FOSS" on the two Qwen 3B
  models — helper D (round 3). New and unexplained: with a game running, a Hollow Knight spoiler question came back
  with no covers (seen once) — helper J (`a5fa30de7c62d2814`) is reading why. Two checks could not run and move to
  block 3 (the https address, the library's go-ahead). **For the maintainer:** the first driver asked about 14 test
  questions in your chat 1 (no spare chat existed yet); nothing was deleted.
- **Deck driver 2** (`adabb010ecd883584`) took over for block 1b, the chores and the blocked checks.
- **Second rounds landed (tip `332be619`), every check green:** helper D round 3 (the model list's pill says "Qwen
  Research" on the two Qwen 3B models, "FOSS" only for Apache or MIT); helper E round 2 (Down and Up reach the next
  section in one press once the one they leave is read; Up into a tall section shows its bottom edge); helper J (a
  real spoiler gap: with a no-story game like Deep Rock running, a question naming a story game like Hollow Knight
  was judged by the running game's rules and lost its covers; now the named story game's rules win, only ever adding
  caution). Block 3 on the Deck re-runs the walks and checks all three.
- **Deck:** block 2 sent — deploy, then one check per fix; the parental-lock half of the Ollama-tab fix cannot run
  (Steam's Family View needs a PIN, and the no-box path would start a real download), so it rests on its unit tests.

## For the helpers: who owns which files

A starting point for the briefs. Each brief names the tip it starts from and its exact files. A helper that needs a file
outside its list stops and reports.

- **A:** `src/utils/markdownFenceReader.ts`, `src/utils/streamMarkdownPrepare.ts`, `src/utils/answerReadableText.ts`,
  the inline-code rendering in `src/components/MainTabBonsaiAiMarkdownChunk.tsx`, and their tests.
- **B:** a new capped-read helper; `ollama_health_probe.py`, `local_ollama_setup_service.py`,
  `token_accounting_service.py`, `response_verify.py` (both the read and the `~~~` fences), `ollama_embed_service.py`,
  `ollama_preload_service.py`, `ollama_chat_stream.py`, and their tests. Caps generous enough that no real answer is
  ever cut; the brief states the numbers.
- **C:** `ollama_urls.py` and wherever the address setting is saved and shown; `voice_model_download_service.py` (pin to
  the commit whose file matches what the Deck already has, so an installed model still passes); the library's file-list
  check. Tests for each.
- **D:** `py_modules/backend/services/model_policy.py`, `py_modules/backend/ollama_routing.py`,
  `src/data/deprioritizedModels.ts`, the tier constants in `src/components/OllamaWhereAiRunsSection.constants.tsx`,
  `README.md`, `docs/troubleshooting.md`. Labels and wording only, never which model is picked.
- **E:** `src/utils/answerBubbleNavigation.ts`, `src/test-harness/deckAnswerWalk.ts`, and their tests. Evidence
  `docs/test-evidence/plan76-P76-WALK-COVERS-try2.json`, `plan76-QA-FREE-PLAY-01-try2.json`,
  `plan76-REPLY-STOPS-MIRROR-01-try2.json`.
- **F:** `src/components/OllamaWhereAiRunsSection.tsx`, `src/hooks/useLocalOllamaSetupFlow.tsx`,
  `src/utils/rememberReturnWhileBoxOpens.ts`, and their tests. Follows commit `6ef8cedf`.
- **G:** `src/hooks/useChatSlots.ts`, `src/hooks/useReplyFeedbackChips.ts`, `src/utils/chatSlotTurns.ts`,
  `src/utils/bonsaiReplyReadyToast.ts`, the ban-lookup row's own code, and their tests.
- **H:** the Strategy prompt in the back end only. The answer-quality run is done by the session, not the helper.
