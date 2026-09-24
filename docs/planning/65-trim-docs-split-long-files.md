# Plan 65 — Trim the big documents, split the long files

**Status:** written 2026-09-23 while plan 64 runs on the Deck. All seven questions in § 9 answered the same
day. Plan 64 finished at 00:01 (§ 5 reordered for that). Nothing started. Waiting only on the word "go". Runs overnight
unattended, restarting itself after a usage-limit stop (§ 11).
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

Written as work lands. Nothing has run yet. Each helper gets a row the moment it starts, so a restart after a
usage-limit stop can find it.

| Job | Helper's agent ID | Its copy | Started | State |
|---|---|---|---|---|
