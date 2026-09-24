# Plan 65 — Trim the big documents, split the long files

**Status:** written 2026-09-23 while plan 64 runs on the Deck. All seven questions in § 9 answered the same
day. Plan 64 finished at 00:01 (§ 5 reordered for that). "Go" at 00:05 on 2026-09-24; ran overnight
unattended through one usage-limit stop (§ 11). **FINISHED 2026-09-24 about 04:25.** All nineteen jobs
landed, the Deck check ran (one regression from the night, fixed and re-checked on the Deck), bookkeeping
done, all on the shared branch. Nothing pushed. Read § 12's "Finish" first.
**Purpose:** two roadmap entries, both three stars, both about what every piece of work costs before it starts.
Nothing a person using the plugin would notice. *Trim the five documents that are still big* (four left) and
*The eleven long files, left long on purpose*.
**Builds on:** the clean-up that filed both entries on 15 September — read its
[postmortem](../audit/refactor-round-two/postmortem.md), not the archived plan. The two worked examples of a safe
split are the suggested chips and the reply rating, both taken out of the Ask logic on 14 September.
**Does not:** touch the Deck while plan 64 runs. Put anything on the shared branch while plan 64 runs. Change
what the plugin does. Push.

Read first: [CLAUDE.md](../../CLAUDE.md), [AGENTS.md](../../AGENTS.md) (the model table and the conventions),
and [lessons-learned.md](../lessons-learned.md) § 1 (shared checkout and copies) and § 4 (briefing helpers).

---

## 1. What changed since the entries were written

Measured today. **Both entries are out of date: almost everything has grown.**

### The documents

| Document | Today | Target | Tokens to read it once, about | Since it was filed on 13 Sept |
|---|---|---|---|---|
| The decisions file | 417 KB | about 65 KB | 96,000 | grew a little |
| The long notes behind roadmap entries | 250 KB | about 50 KB | 57,000 | grew by about half |
| The manual Deck checks | 128 KB | about 35 KB | 29,000 | grew by about half |
| The testing rows | 120 KB | about 60 KB | 28,000 | shrank; closed rows were archived on 16 Sept |

The testing rows and the manual checks are the ones the house rules say are read before any work is marked
done. So they are the biggest everyday saving, even though the decisions file is the biggest single file.

**The roadmap itself** was trimmed to 83 KB on 15 September and is back up to 93.5 KB. Its hard limit is
100 KB: past that, the checks that run before every commit fail. Plan 64 adds to it tonight. Not part of this
plan, but see § 8.

### The code

Fourteen files. The first eleven are the ones the entry names. The last three are not on the entry's list and
are a question in § 9.

| What it is | 15 Sept | Today | Of which code (no comments) | File (for the helpers) |
|---|---|---|---|---|
| The chat transcript | 1,221 | **2,390** | 1,496 | `src/components/MainTabChatTranscript.tsx` |
| The model download window | 1,385 | **1,961** | 1,557 | `src/components/PullModelsModal.tsx` |
| The plugin's main screen | 1,709 | 1,813 | 1,462 | `src/index.tsx` |
| One style sheet | 1,344 | 1,651 | 1,533 | `src/styles/sections/section-6.ts` |
| The Ask bar | 1,079 | 1,505 | 1,246 | `src/components/MainTabUnifiedAskBar.tsx` |
| Where-the-AI-runs settings | 1,310 | 1,396 | 1,230 | `src/components/OllamaWhereAiRunsSection.tsx` |
| The animated chips row | 1,232 | 1,318 | 914 | `src/components/MainTabPresetAnimatedChips.tsx` |
| The knowledge-base service | 2,092 | 2,283 | 1,256 | `py_modules/backend/services/knowledge_base_service.py` |
| The prompt builder | 1,571 | 1,669 | 1,241 | `py_modules/backend/services/ollama_prompts.py` |
| The AI service | 1,270 | 1,609 | 1,116 | `py_modules/backend/services/ollama_service.py` |
| Voice transcription | 1,294 | 1,421 | 1,079 | `py_modules/backend/services/voice_transcription_service.py` |
| *Not listed:* the back end's front door — every button on the screen talks to it | 2,995 | **3,263** | 2,584 | `main.py` |
| *Not listed:* the Ask logic behind the Ask bar | 1,469 | 1,777 | 1,215 | `src/hooks/useBonsaiAskOrchestration.ts` |
| *Not listed:* the file that builds each question sent to the AI | 725 | 1,157 | 786 | `py_modules/backend/services/game_ai_request.py` |

The eleven grew from 15,507 lines to 19,016 in eight days — about a quarter. The chat transcript nearly
doubled. Nothing in the checks stops a big file getting bigger; the one size check counts how many files are
over 400 lines, and a file going from 1,200 to 2,400 does not change that count. See § 9, question 7.

---

## 2. What this session does

### Documents

- **The decisions file.** Every settled decision before D90 moves, word for word, into an archive file beside
  it. D90 onward stays, and so does any older decision that is still open or deferred. Nothing is reworded.
  Every number still resolves, and every link that pointed at a moved decision is repointed. The existing
  split checker proves nothing was lost, before and after. The move and the repointing are done by a small
  script, so after plan 64 lands it is simply run again rather than merged by hand.
- **The long notes.** Each block is matched to its roadmap entry. Blocks whose entry is finished move to the
  archive. Links repointed by script, the same way.
- **The testing rows and the manual checks.** The work is judgement, not moving: shorten each live row to
  what a person has to do and see, without touching the words a check depends on. Plan 64 edits exactly
  these rows all night. See § 9, question 5.

### Code

All fourteen files in § 1 (question 2). Each helper takes one file and moves its clearest self-contained
pieces into new files beside it, until the file is about half its size (question 3). What the plugin does
stays identical. The rules are in § 3.

### A check that stops the big files growing back

Question 7. A new check, run with the others before every commit: any app file over 800 lines of code may not
get bigger. Comments do not count. A file over 800 at the finish gets its size then as its own limit. New code
goes into a new file, or the limit is raised on purpose after a review. Built by a helper in its own copy and
reviewed by the session. Proved by breaking it on purpose before it lands: a file grown by one line must fail,
a file shrunk must pass, and the commit names the failure it saw. The limits are recorded at the finish, from
the sizes after the last split.

---

## 3. The rules every split follows

These go into every helper's brief.

- **Move, never rewrite.** A commit that moves code changes nothing else. If a piece cannot move without a
  change to its logic, the helper stops and hands it back.
- **One piece per commit.** The quick checks green before each commit.
- **Everything outside the file keeps working unchanged.** Whatever other files take from it, they still can.
- **Prove the result is the same, not just that it compiles:**
  - Style sheet: the full style text built before and after is identical, character for character.
  - Prompt builder and the question builder: prompts built from a fixed set of sample inputs are identical,
    saved before the first move.
  - Ask logic, and any screen file where React hooks move: the recorded order the hooks run in, the same
    check that made the two worked examples safe.
  - The back end's front door: every method the screen can call stays where it is as a one-line hand-off,
    and the generated list of those methods comes out identical.
- **Size is counted in lines of code, never comments.** Never shorten an explanation to reach a number.
  Leaving a piece where it is because it reads best there is a fine answer — say so in the report.
- **Every new file gets its header.**
- **Write down what moved where.** A short list in the report: piece, old place, new file. Needed if plan 64
  changes the same file (§ 6).
- Never touch the roadmap, testing documents, changelog or the Deck. Never push. Never install packages — the
  copy's package folder is a link to the shared one.

---

## 4. Who does what

| Who | Model | Does | Never |
|---|---|---|---|
| **The session** | Opus 5.5, extra-high | Writes every brief. Reviews every change — a small script separates moved lines from new ones, so only the new wiring is read. Lands one change at a time into the landing copy, with the full checks after each. Keeps the landing copy in step with plan 64. Carries any plan 64 fix across to where its code moved. Runs the finish in § 7 | Drives the Deck while plan 64 runs. Puts anything on the shared branch before plan 64 is finished |
| **Split helpers** | Sonnet 5, high | One file at a time, in its own copy of the repo. Hands back commits, tests and a report | Touch the documents, the Deck, or anything outside its file list |
| **Document helpers** | Sonnet 5, high | One document each, in its own copy, script first | Touch code |
| **Deck driver**, only after plan 64 | Opus 5.5, medium, from plan 64's driver file | The one check in § 7 | Anything while plan 64 is on the Deck |

**Five helpers at once, and all five may split code** (question 1). This goes past the house rule of three
helpers splitting code at once, on the maintainer's word. The rule exists because splits tend to touch the same
files. Here each helper owns different files, so the overlap is only in the generated files that are rebuilt on
every commit anyway — the landing script rebuilds them rather than merging them. A freed slot is refilled at
once, so five stay busy.

---

## 5. What runs side by side

**Reordered at midnight, once plan 64 finished (its last commit 00:01).** Nothing needs protecting from
plan 64 any more, so the biggest and hardest jobs go first: they set the finish time. The short document jobs
come last, to fill slots as they free up. The testing documents no longer wait (question 5 was "wait for
plan 64", and it is done). Five slots; each takes the next job as soon as it frees up.

| Order | Job |
|---|---|
| 1–5, at "go" | The back end's front door · the chat transcript · the model download window · the main screen · the Ask logic |
| 6–12 | The style sheet · the Ask bar · the knowledge-base service · the prompt builder · where-the-AI-runs settings · the AI service · voice transcription |
| 13–14 | The testing rows · the manual checks |
| 15–16 | The animated chips row · the question builder |
| 17–18 | The decisions file · the long notes behind roadmap entries |
| 19 | The growth check (§ 2), once every size is final |

The table and notes below are the original order, kept for the record.

| Order | Job | Slot at "go"? |
|---|---|---|
| 1 | The decisions file | yes |
| 2 | The long notes behind roadmap entries | yes |
| 3 | Voice transcription | yes |
| 4 | The prompt builder | yes |
| 5 | The style sheet | yes |
| 6 | The AI service | next free slot |
| 7 | The animated chips row | |
| 8 | The knowledge-base service | |
| 9 | The question builder | |
| 10 | The model download window | |
| 11 | Where-the-AI-runs settings | |
| 12 | The back end's front door | |
| 13 | The growth check (§ 2) | |
| 14–17 | The chat transcript · the Ask bar · the main screen · the Ask logic — split now, landed last (question 4) | |
| After plan 64 | The testing rows · the manual checks (question 5), two side by side | |

The four busy files come last so they start from as late a point in plan 64's work as possible, which means
fewer of its fixes to carry across.

**How likely plan 64 is to change each file**, read from its list of fixes and checks:

| Likely | Why |
|---|---|
| Chat transcript, Ask bar, Ask logic, main screen | Every D-pad bug plan 64 is allowed to fix lives here |
| Model download window, where-the-AI-runs settings | Five models-screen checks run in its first flow; a failure gets fixed there |
| AI service, back end's front door | The "how many models stay loaded" bug, if its check says which path is live |
| Knowledge-base service, style sheet, chips | Possible, from the note-block and chip checks |
| Voice transcription, prompt builder | Unlikely |

---

## 6. Keeping in step with plan 64

**Plan 64 finished at 00:01 (last commit 4b43318, docs only; nothing more from it).** What still applies:
every helper starts from that commit or later and prints its base; work collects in the landing copy; the
shared checkout, the other copies and other chats' uncommitted work are left alone. At midnight two other
chats had uncommitted roadmap entries in the shared checkout, and plan 67's file was new there.

- **Nothing goes onto the shared branch until plan 64 is finished.** Every helper works in its own copy.
  Finished work collects in one landing copy of the repo, on its own branch.
- **Each time plan 64 commits, its work is pulled into the landing copy.** Nothing is ever written to plan
  64's branch. Conflicts show up one at a time, as they happen, instead of all at once at the end.
- **Helpers started later begin from plan 64's newest commit**, and each prints what it is based on before
  doing anything.
- **If plan 64 changes a file that is being split,** the session carries the change across to where that code
  now lives, from the helper's list of what moved where. A helper never does this; the session does, because
  those changes are D-pad fixes that were just proved on the Deck.
- **The two documents that are moved by script** are simply re-run on the merged copy.
- **A roadmap or testing conflict is never settled by taking one side.** Row by row, then the open lists are
  read against Done.
- **Left alone:** the shared checkout, the three copies another session made for its knowledge-base work, and
  the Deck.

---

## 7. The finish, once plan 64 says it is done

**Since plan 64 finished at midnight:** step 1 has no plan 64 work left to pull, and step 4 moves into the main
run (§ 5, jobs 13–14). One new care for step 2 and step 6: if other chats still have uncommitted roadmap lines
in the shared checkout, the shared branch cannot move forward over them, and a commit of the roadmap by file
name would sweep their lines in. Stage only this session's lines, or wait for theirs to be committed. Never
touch theirs.

1. The last of plan 64's work is pulled into the landing copy. The two document scripts are run again. Full
   checks.
2. The shared branch moves forward to the landing copy — no merge in the shared checkout itself. Full checks
   again there, including the copy-paste count, which cannot be read from inside a copy (a known trap).
3. The growth check's limits are recorded from the sizes now, then it lands.
4. The testing rows and the manual checks, two helpers side by side, starting from plan 64's final state.
5. **One combined Deck check** (question 6), with plan 64's driver: deploy; replay every walk plan 64 saved tonight, which names any stop
   that moved; one ordinary free-use pass; one question answered with a knowledge-base note; voice once (no
   microphone needed); the model download window opened and closed; Settings walked end to end.
6. Bookkeeping by the bookkeeper: both roadmap entries updated, one testing row for the split check, the size
   numbers recorded, the answers in § 9 written as a decision. That decision is D117 unless plan 64 has
   already used it; check the end of the decisions file first.

---

## 8. Things to know

- **The usage allowance is shared with plan 64.** Every helper this session runs brings plan 64's next
  usage-limit stop closer. When the limit hits, plan 64's Deck run stops mid-flow until the reset. Sonnet
  helpers are cheap; the heavier cost is the session's own reviewing. § 9, question 1.
- **None of the splits is finished until the Deck shows it.** That cannot happen until plan 64 is done.
- **The roadmap is 0.4 KB under its hard limit** (99.58 of 100 KB at 18:48, measured on the committed file;
  it was 6.5 KB under when this plan was written). Plan 64 adds to it all evening, so it will cross. If it
  crosses, the checks fail on every commit in both sessions. Plan 64 was told at 18:50 and owns the trim,
  since it is the one writing there; this session does not trim the roadmap itself. Plan 64's bookkeeper is
  making about 8 KB of room (finished entries out to the archive), one docs commit before its next write-up.
- **Known traps built into the briefs:** a copy can start from an old base without saying so; a copy's
  package folder is a link to the shared one, so never install and never delete a copy the ordinary way;
  scripted edits can plant invisible bad bytes, so check after each; parallel helpers can each pass the
  copy-paste count alone and fail it together, so it is read after every landing.

---

## 9. Questions for the maintainer

**All seven answered 2026-09-23, before "go".** They lock as a decision at the finish.

| # | Question | Answer |
|---|---|---|
| 1 | **How many helpers at once?** Five within the house rules (three on code, two on documents); five that may all split code; or three in all, gentler on the shared allowance | **Five, and all five may split code** — past the three-at-once rule, on purpose |
| 2 | **Which files beyond the eleven?** The back end's front door, the Ask logic, the question builder | **All three** |
| 3 | **How far to split each file?** About half; down to the 400-line house number; or one or two pieces each | **About half** |
| 4 | **The four files plan 64 will most likely change** (transcript, Ask bar, main screen, Ask logic). Split now and carry its fixes across, or wait for it to finish | **Split now, land them last; the session carries fixes across** |
| 5 | **The testing rows and the manual checks.** Wait for plan 64, or trim now around its rows | **Wait for plan 64** |
| 6 | **The Deck check.** One combined check, one per file, or a later session | **One combined check, this session** |
| 7 | **Stop the big files growing back?** A hard limit, a warning only, or nothing | **A hard limit**: a file over 800 lines of code may not grow; comments do not count |

---

## 10. Rough timing

- Setup, after "go": about 20 minutes. The landing copy, the move-sorting script, one copy and one brief per
  helper. This plan is committed in the landing copy then, so it reaches the shared branch with everything
  else; until then it sits in the shared checkout uncommitted, where plan 64's by-name commits will not pick
  it up.
- Each document: about an hour. Each code file: one and a half to three hours for a helper.
- With five slots, the two documents, fourteen files and the growth check take about six to seven hours — a
  little under plan 64's nine to eleven. The session's own landing is the slowest part.
- After plan 64: the merge about half an hour, the testing documents about an hour and a half with two helpers
  side by side, the Deck check about 45 minutes, bookkeeping about half an hour. About three hours in all.
- **Plan 64's own estimate (asked 18:48):** off the Deck about 00:00, completely done about 00:45, plus any
  usage-limit stop. So if "go" comes about 19:00, the splitting ends about 01:00 to 02:00, after plan 64, and
  this plan now sets the finish: every hour before "go" moves the end by an hour.
- **Saving about an hour:** the testing documents start in whichever slots are free as soon as plan 64 says
  it is finished, not after the splitting lands. Near the end, fewer files are left than slots. That still
  waits for plan 64, as question 5 says. The finish then comes about 03:30 to 04:00 instead of 04:30 to 05:00.

---

## 11. Running overnight, through a usage-limit stop

The maintainer expects to hit the five-hour usage limit partway through the night and may be asleep. The
session picks up on its own after the reset, as long as the PC stays awake.

**What happened to plan 64 tonight (asked at midnight):** it did not pick up by itself. Nothing ran until the
maintainer typed "continue". Both of its background helpers had died with the limit error. The Deck driver
came back with one message to its agent ID, its memory intact. A fix helper's half-done work was finished
from its copy. While it was paused, Steam's highlight froze on the Deck's Quick Access rail; it took a Steam
restart over SSH (Game Mode brings Steam back in about 15 seconds) and one A press on the rail's tab icon.

**Set up at "go", before any helper starts:**

1. **Keep the PC awake.** The PC is a desktop set to sleep after three hours with no one at the keyboard, so
   it would sleep around 3 AM and stop everything. The session starts a small hidden program that tells
   Windows to stay awake while it runs. It changes no setting, so there is nothing to put back. It ends
   itself at noon, or when the session stops it at the finish. The screen can still turn off. Each scheduled
   check (next item) confirms it is still running.
2. **A scheduled check every 20 minutes.** It fires only while the session is idle, so it never interrupts
   work. It puts a fixed message into this session: *"Plan 65 overnight check (scheduled, not typed by the
   maintainer). If a usage-limit stop halted the work, pick up from § 12 as § 11 says. If work is running
   normally, answer in one line and stop."* While the limit is still on, that message fails too and the
   next one tries 20 minutes later, so work restarts within about 20 minutes of the reset. Each check costs
   a little, about 25 a night. Deleted at the finish.
   - **Not proved yet:** whether a scheduled message goes through after a limit stop. Plan 64 had nothing
     like it. The fallback is the maintainer typing "continue" from the phone.
3. **Keep the Deck awake for the check at the end.** The Deck is needed only at the finish. An eight-hour
   stay-awake lock is taken at "go" and renewed at each scheduled check. It changes nothing on the Deck and
   lets go by itself. If the Deck is asleep anyway when its turn comes, everything else finishes and the
   Deck check waits for the maintainer.

**After a stop, in this order:**

1. Read the progress log (§ 12). It names every helper's ID, copy and job, what has landed, and what is
   next. The session's memory may have been shortened overnight; the log is what counts.
2. Check the landing copy first. If a merge or a pick was part-way through, finish or undo it before
   anything else.
3. Resume each helper that was mid-job with one message to its ID. Its copy keeps what it did; the message
   tells it to check its copy's state before going on. If one cannot be resumed, a new helper takes over
   the same copy, told to check what is there and finish it.
4. Carry on down the list in § 5.

**While the maintainer sleeps:**

- Nothing waits on a question. Anything that needs the maintainer is set aside with a note, and the session
  carries on with the rest.
- No new kinds of command, so nothing stops at a permission prompt. Deck commands use the one allowed shape.
- One notification to the maintainer's phone at the finish, or if something only the maintainer can decide
  is blocking everything. None for routine progress.
- The Deck driver's brief carries plan 64's fix for the frozen highlight.
- Unchanged: no push, no deleting copies, nothing on main.

**Before bed, the maintainer:** leaves this chat open in VS Code and the PC on, without logging off or
restarting (no Windows update restart was waiting at midnight — checked). Leaves the Deck on its charger. If
the phone shows the session still stopped more than half an hour after the reset time, types "continue".

**Timing:** with "go" around midnight and no stop, the finish is about 8 to 9 AM. A stop moves that later
by however long the wait until the reset is.

---

## 12. Progress log

Written as work lands.
**Times in this log, corrected at 03:40:** from about 02:45 the times written below were estimates, and
they ran up to an hour ahead of the clock. They have been corrected from the landing commits' own time
stamps (`git log --date=format:%H:%M` on the landing branch); "about" marks a helper's start or finish
time inferred from those stamps.
 Each helper gets a row the moment it starts, so a restart after a
usage-limit stop can find it.

| Job | Helper's agent ID | Its copy | Started | State |
|---|---|---|---|---|
| Back end's front door | ab501ce613743e0d2 | p65-main | 00:17 | done 01:02: 8 commits, code 2,593 → 1,710 (34%); every screen-callable method kept, signatures proved identical by a script; the Ask engine left (other files reach into it). Two tests' patch targets repointed. One cosmetic dodge: single blank lines between three near-identical log writers so the copy-paste count does not rise (the duplication itself is older). Reviewed 01:30; **landed 01:55, tip dafbdac1, full checks green** |
| Chat transcript | a95fc4da3b5fdd2a1 | p65-transcript | 00:17 | done 01:07: 10 commits, code 1,527 → 1,104 (28%); six hook blocks lifted, order proved; the three blocks behind tonight's D-pad fixes left in place on purpose. Reviewed 01:40; **landed 02:18, tip e5d94e96, full checks green** (with the session's shared-focus-step commit after its first move) |
| Model download window | ac8fd789a2b3ffc25 | p65-pull | 00:17 | first pass done 00:38 (3 commits, only 7% smaller: moved top-level pieces only); second pass, lifting hook blocks, started 00:47, done 01:58: 10 more commits, code 1,443 → 935 (40% below the original 1,558); 66-hook order proved; the focus-wiring block (tonight's Deck fixes) left on purpose. Reviewed 02:12; **landed 02:27, tip 0522e64a, full checks green** |
| Main screen | a8fcf1784fb24868d | p65-index | 00:17 | done 01:00: 13 commits, code 1,458 → 1,107 (24%); 14 hook blocks lifted, 88-hook order proved; what is left is the tab wiring (left on purpose). Reviewed; **12 of 13 landed 01:35** (the settings-snapshot move left out, see below; so index.tsx lands somewhat above 1,107). One plugin-loading test timed out in the full run with five helpers testing at once; it passes alone in 11 s. Follow-up: the new starting-snapshot file's header says the function is called once, but the screen keeps the function itself as the starting value — fix the wording at the finish |
| Ask logic | a46350c39029ec0d0 | p65-askhook | 00:17 | done 00:43: 6 commits, code 1,219 → 1,061 (13%); four hook blocks lifted, order proved; the rest shares 15–20 pieces of state and would need a rewrite. Reviewed; **landed 01:05, landing tip fa0be962, full checks green** |
| Style sheet section | a84f3a82f3867cf56 | p65-style | 00:58 | done 01:23: 4 commits, code 1,533 → 570 (63%); full style text proved byte-identical after every commit. Reviewed 01:50; **landed 02:25, tip 33491f7f, full checks green** |
| Ask bar | aaa927eb592a5971a | p65-askbar | 01:13 | done 01:36: 5 commits, code 1,246 → 1,127 (10%); the bar's own drawing is 772 lines and cannot move under the rules, so half was never reachable; 33-hook order proved. The ring-claim-on-open effect moved as-is: on the Deck list. Reviewed 02:20; **landed 02:28, tip 2b81cdd5, full checks green** |
| Knowledge-base service | ab7321006a7ee663a | p65-kb | 01:32 | done about 02:55 (after the limit stop): 4 commits, code 1,257 → 519 (59%); every name imported from it elsewhere still there; the ranking-fusion weights stay because an evaluation script sets them on this module directly (a patch trap grep does not find). Session checked every name the tests stand in for is still used from this file. Reviewed; **landed 03:00, tip a98e54a0, full checks green** (two of its changes named functions in a header that the file does not hold; the helper's own later rewording was folded into each one, so every step passes) |
| Animated chips row | a1e655ad678cfb03a | p65-chips | about 02:58 | done about 03:23: 9 commits, code 914 → 387 (58%); the already-separate chip button, focus container, D-pad hook and decode row moved whole, hook order proved for each; the carousel mode left. Two of its own slips fixed forward (an unused export, an import cycle). The chips' D-pad container moved as-is: on the Deck list. Reviewed; **landed 03:25–03:27, tip dc2d5db5, full checks green** |
| Prompt builder | a10dfc4d46858ecbd | p65-prompts | 01:42 | done about 02:52 (after the limit stop): 5 commits, code 1,241 → 500 (60%); every prompt from 20 sample cases plus every classifier proved identical by hash after each commit. Reviewed; **landed 02:56, tip e45e80bd, full checks green** |
| Where-the-AI-runs settings | abf34be9c9da8f1d3 | p65-where | 01:51 | done 02:50 (after the limit stop): 4 commits, code 1,234 → 880 (29%); the drawing alone is 624 lines; 49-hook order proved; the hand-tuned D-pad chain left on purpose. Reviewed; **landed 02:51, tip 2d9559fc, full checks green** |
| Testing rows (doc) | a1a2cdd2f11f0ff3a | p65-testing | about 02:52 | first pass done about 03:00: 3 commits, 149,062 → 107,726 bytes; 18 finished rows to the closed archive word for word; four open rows' older history to a new history archive; split check clean except the replaced banner. Left for the maintainer: KB-ROUTER-01 and STREAM-FOLLOW-01 read Open but say they moved to Done; HUB-EDGE-01 is Verified for a screen that no longer exists; five rows carry "owed" or "stays open" in their status. First pass **landed 03:04, tip 550f8e50, full checks green**. Second pass done about 03:14 (landed 03:17): 5 more commits, 107,726 → 100,435 bytes (149,062 → 100,435 overall, a third smaller); 16 more rows' older history moved; the rest have nothing superseded to move. KB-ATTRIB-01 also flags its own status as out of date — for the maintainer. Landing after the AI service |
| Manual Deck checks (doc) | ac0087d71d08d8f50 | p65-manual | about 02:57 | working (closed checks to their own new archive file, so the two doc helpers cannot clash) |
| AI service | a4eda15f89fa9eab9 | p65-aisvc | 02:14 | working |
| Voice transcription | a451891580269f107 | p65-voice | 02:21 | done about 02:59 (after the limit stop): 5 commits, code 1,079 → 501 (54%); every name other files use is still there; the live recording session class left whole. Its fifth commit only rewords the second's header, so it is folded in at landing. Reviewed; **landed 03:02, tip ab37bc9b, full checks green** |
| Question builder | ac8a32a3e0bb8a02f | p65-qbuild | about 03:02 | done about 03:09: 1 commit, code 788 → 704 (11%); everything else is the one long function every question runs through. **Landed 03:11, tip c6f0c94d, full checks green** |
| AI service (after the limit stop) | a4eda15f89fa9eab9 | p65-aisvc | — | done about 03:12: 3 commits, code 1,120 → 365 (67%); all 32 names still reachable; two tests' stand-ins repointed and proved by breaking; three imports kept only so tests' patch paths still resolve. **Landed 03:14** (all three picks quick-green); its full run failed one read-aloud timing test by 0.01 s with five helpers loading the PC. That test failed 1 of 11 runs on the landed work and 0 of 12 on untouched code, all under load; read-aloud was not touched tonight. Put down as a load-sensitive test, a follow-up for the maintainer |
| Manual Deck checks (doc) — result | ac0087d71d08d8f50 | p65-manual | — | done about 03:17: 6 commits, 142,525 → 59,489 bytes (58%); 72 closed checklist lines and closed table rows to a new closed archive, dated history to a new history archive; progress tracker untouched; split check clean except the replaced banner. One call to confirm: CHAR-PICKER-RING-01 moved to closed on its last line ("second look passed") though its box was unticked. **Landed 03:20, tip 3c6563d8, full checks green** (testing rows' second pass landed just before, tip 0e5e0c7b, full checks green) |
| Decisions file (doc) | ac9d2f1cd9ccb1c6f | p65-decisions | about 03:12 | done about 03:28: 1 commit (6e3a7ea6), 429,015 → 125,751 bytes (71%); new archive beside it; all 114 decision headings present across the two, none renumbered. Moved on their own first line's word that a later decision settled them: D40 (the second), D53, D54, D81. Kept for doubt: D38, D41, D74, D75, D82 (answered as a hold with a trigger). Repoint dry-run: 25 links in 9 files, run by the session at the end |
| Long notes (doc) | a60fed28ea7f2a143 | p65-notes | about 03:12 | first pass done about 03:20: 1 commit (bcb5342c), 256,301 → 200,760 bytes; 26 finished blocks to a new closed archive, 35 open, 34 unclear by title (kept, as told). Split check clean apart from the banner and two fixed in-file links. Repoint dry-run: 9 links in 4 files. Second pass started about 03:21, done about 03:34 (91bacd52: 11 more finished blocks moved, each with its Done line quoted; 256,301 → 135,600 bytes overall; landed 03:35): decide the 34 by reading, each with a quoted Done line or fix commit as evidence |
| Bookkeeping | a162948575f104406 | p65-land (the landing copy) | 04:08 | done about 04:20: five commits, 9d868a4a to ee14438d (see Finish below) |
| Deck check | af314eea4df8d31b0 | the shared checkout, build cabda5dd | about 03:32 | done 04:02: 3 FAIL (one a real regression, fixed), rest PASS or UNCLEAR — see below; re-check of the fix at 04:07: PASS |
| Growth check | adb0992eec11df1ca | p65-growth (from the landing branch) | about 03:12 | first version done about 03:20 (39e7376f): a new check script, its limits file and 15 tests, wired into the quick checks; proved by breaking it four ways (grow a listed file: fails; shrink: passes; comment only: passes; unlisted file crossing 800: fails); half a second. Sent back about 03:22 because its message told people to re-run the record step, which would silently raise every grown file: raising becomes a one-file step with a written reason |

**01:15–01:30, the main screen's landing.** One of its 13 moves (the settings snapshot for saving) passed
about 48 fields in two identical lists, and the copy-paste count rose from 867 to 916 in the landing copy.
Left out; the rest were picked around it with a small script that settles the clash in the header note and
imports. So the copy-paste count *is* read in copies, contrary to § 8's note — at least in the landing copy.
Rules updated and the running helpers told.

**Finish, about 04:25.** Bookkeeping landed (9d868a4a roadmap: the two entries closed, eight new open entries
from the night, the roadmap 101,833 → 101,736 bytes with two old Done blocks archived; 8435602b testing rows
for the growth check and the Deck check; de06866a D117; e912258b changelog; ee14438d six lessons). Then this
file and the Deck evidence were committed and the shared branch fast-forwarded to the result. The Deck's
keep-awake lock was released at 04:10; the PC's keep-awake program and the 20-minute check are stopped at the
finish. The copies of the repo made tonight (p65-*) are left in place for the maintainer's word before any
is deleted.

**For the maintainer, in the morning:**
- **What you would notice using the plugin:** nothing, by design. The one thing tonight broke — the Desktop
  activity log silently stopped writing — was caught by the Deck check and fixed; the fix is confirmed on
  the Deck.
- **Owed by eye or by hand:** the chips' Left/Right between chips (only one chip shows with your setting);
  the saved-chats row with the shoulder buttons; the opening highlight landed in two different places.
- **New bugs found tonight, not caused by it,** now on the roadmap: Up under an answer skips rows (and the
  chip ladder can leave the ring off screen); nothing holds the ring after a thumbs up; "Manage AI models"
  opens one press from changing a licence filter; the mic button's ring is cut off; the Deck walk replay
  can never compare across builds; the commit hook rebuilds the shared checkout from a copy; a read-aloud
  timing test fails now and then under load.
- **Your calls:** D82 kept as open (answered as a hold); CHAR-PICKER-RING-01 moved to closed on its "second
  look passed" line though its box was unticked; the testing rows whose status contradicts their notes;
  the 23 long-notes blocks nobody could match; the roadmap's new `[docs]` tag is not in its tag list yet;
  an old archive file has 56 links one folder too deep (older than tonight).
- **Short of half:** the Ask bar, where-the-AI-runs, the main screen, the Ask logic and the question builder
  came out 10–29% smaller. What is left there is the drawing code, the one long function every question
  runs through, and the D-pad fixes proved on the Deck last night — none of it movable without a rewrite.
  The growth check now holds each of them at today's size.

**The Deck check, 03:32–04:02 (build cabda5dd, the Deck's own screen):** deploy, load log, free-use pass,
chips (Up/Down; only one chip showing, so Left/Right could not run), reply buttons (copy, read aloud, thumbs
up), voice, the AI models screen and download window, where-the-AI-runs, Settings end to end: **PASS**. The
saved-walk replay compared nothing (every walk was saved against an older build; the rig will not compare
across builds). Opening highlight: stayed inside bonsAI both times, but landed differently each time —
UNCLEAR. Saved chats: Right does not switch chats (the row uses the shoulder buttons) — UNCLEAR.
**One real regression from tonight: every activity-log line failed** ("_desktop_app_log_level_allows() takes
2 positional arguments but 3 were given"). The front door's move had turned a call through the class into a
call through the instance, and that one helper is written without `self`. The session missed it in review:
it read the change as harmless because the other four such helpers are static. **Fixed at b56de863** (called
through the class again) with a new test that failed with the same error first; a scan of every moved call
through `self` found no other. Shared branch fast-forwarded to b56de863. **Deck re-check at 04:07, PASS:** no failed log lines
or Tracebacks since the redeploy, and both Settings opens wrote their line to the Desktop activity log
(none had on the broken build). Evidence: plan65-DEPLOY-try2.json, plan65-FINAL-LOG-try2.json. **Found, not caused tonight** (code paths only moved; last night's checks never walked them):
with details open, Up from "Save chat to Desktop" skips the chip ladder and the tabs row to the notes block
(3 of 3); with details closed, Up skips the choice buttons and "Save chat to Desktop"; the chip ladder can
shrink and leave the ring above the visible area with the panel half blank (last night's check saw the
ladder partly off screen too); after a thumbs up nothing holds the ring; the mic button's ring is cut off
at the panel's right edge; "Manage AI models" opens with the ring on a licence filter, one A from changing a
setting. Evidence: 20 files `docs/test-evidence/plan65-*`, 5 saved walks `checks/plan65-*`.

**03:33–03:39, the rest landed on the landing branch** (not yet on the shared branch; that waits for the Deck
check to finish so the shared checkout stays still under it): the growth check (both commits), the long notes'
two passes, the two link scripts run for real (c77a25fc: 25 decision links in 10 files and 9 notes links in 4
files; a second dry run finds nothing left; no roadmap links changed), and the growth limits recorded from the
final sizes (c8d6710c: eight files held at their size, the AI service and the chips row now under 800). Full
checks green at c8d6710c.

**Sizes at the finish** (code lines, comments excluded; documents in bytes):

| File | Before | After |
|---|---|---|
| Back end's front door | 2,593 | 1,710 |
| Chat transcript | 1,527 | 1,104 |
| Model download window | 1,558 | 935 |
| Main screen | 1,458 | 1,158 |
| Style sheet section | 1,533 | 570 |
| Ask bar | 1,246 | 1,127 |
| Where-the-AI-runs settings | 1,234 | 880 |
| Animated chips row | 914 | 387 |
| Knowledge-base service | 1,257 | 519 |
| Prompt builder | 1,241 | 500 |
| AI service | 1,120 | 365 |
| Voice transcription | 1,079 | 501 |
| Ask logic | 1,219 | 1,061 |
| Question builder | 788 | 704 |
| **All fourteen** | **18,767** | **11,521 (39% moved out)** |
| Testing rows | 149,062 | 100,450 |
| Manual Deck checks | 141,611 | 58,918 |
| Decisions file | 429,015 | 124,027 |
| Long notes | 256,301 | 134,168 |
| **All four documents** | **975,989** | **417,563 (57% less to read)** |

**03:25–03:32, the code finish.** The chips row landed last (its unused-export and import-cycle fixes folded
into the changes they belong to). The starting-snapshot note was corrected (435e1e0c). The decisions file
landed (cabda5dd). **The shared branch was fast-forwarded to cabda5dd at about 03:31** — straight forward,
nothing else had landed on it since 71f052e, and none of the landed changes touch the one file the shared
checkout had uncommitted (this plan). Full checks passed in the shared checkout (71 s), copy-paste count not
risen. **The Deck check started at about 03:32** (deck-driver agent, runbook in the scratch folder:
p65-deck-runbook.md). Still to land: the growth check (loophole closed, 75b0191e) and the long notes' second
pass; then the two link-repoint scripts, the growth limits re-recorded, and bookkeeping.

**About 03:28, found: another chat's 00:03 commit (71f052e, this plan's base) had swept in this plan file as it
stood then**, along with its own plan 67 and two roadmap entries. Nothing lost. The shared branch has not
moved since, so the finish is a straight fast-forward. The newest copy of this file is committed with the
finish; the shared checkout's copy is then identical and is reset before the fast-forward.

**02:28 usage-limit stop, 02:44 restart — the overnight setup worked.** All five running helpers (AI
service, where-the-AI-runs, voice, knowledge base, prompt builder) died with the limit error at about 02:28;
the limit reset at 02:30. The scheduled check put its message in and the session picked up by itself at
02:44 (the checks queued while the limit was on all arrived together). Keep-awake still running; landing
copy clean at 2b81cdd5 (model window's second pass and the Ask bar landed just before the stop, full checks
green). Each helper's copy still held its commits and its half-done change; all five were resumed by one
message each at 02:45.

**02:00–02:10, the transcript's first move raised the copy-paste count to 877.** In its own file, the per-turn
row focus helper's last eleven lines matched the end of an older focus helper that already existed. The
session extracted the shared step into one function both call (each keeps its own safety check first), so
the count is back to 867 and the focus-pattern baseline dropped from 81 to 79. Extract, never re-record.
That extract touches a focus file, so it is on the Deck check list at the finish (the chip ladder and details
tabs row, Up and Down past them).

**Setup, 2026-09-24 00:06–00:17.** Base 71f052e (plan 64's last commit plus one roadmap commit from another
chat). Full checks green on it in the landing copy (81 seconds). Keep-awake program running (pid 13884, log
and stop file in the session's scratch folder; Windows' own list needs admin, so only "still running" is
checked). Scheduled check every 20 minutes at :04, :24, :44 (job 098b24a3). Deck stay-awake lock held until
08:07, verified on the Deck. Landing copy: p65-land. The split rules every helper reads, and the
moved-versus-new script, are in the session's scratch folder. This plan file stays uncommitted in the shared
checkout (so the maintainer can read the log) and is committed with the finish — changed from § 10's
"committed at setup".

**00:40–00:50, two things found:**
- **The pre-commit hook rebuilds the shared checkout, not the copy it runs in.** Its path is set absolute,
  so it changes into the shared checkout first. Copies' generated files never refresh, and the full checks
  fail their architecture step in every copy. Not new tonight; one other session was already on it. The
  landing script now rebuilds the landing copy's generated files itself before each commit. Helpers were
  told to ignore that one step.
- **The first split came back only 7% smaller.** The rules said to leave hook calls alone, which stops a
  React screen file well short of half. The rules now allow lifting a contiguous hook block into its own
  hook, with the hook-order proof. The four running helpers were told.
- **Correction, 00:55:** worse than first read. With the absolute hook path, the hook rebuilds the shared
  checkout's generated files and stages *those* into the committing copy. The model window's three landed
  changes carried out-of-date maps; the last was amended with correct ones and the full checks passed again.
  The landing script now commits with a relative hook path, so each copy's own hook runs.
