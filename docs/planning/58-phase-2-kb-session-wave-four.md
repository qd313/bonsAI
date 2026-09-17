# 58 phase 2 — The knowledge-base session: wave four, with Deck checks running alongside

Written 2026-09-16, before any code was started, at the maintainer's request. They asked to pick the
knowledge base back up, in the shape of [plan 56](56-feature-session-four.md): a plan first, work split
across helpers running side by side, the Deck driven by the one running the session the whole time, and
a list of questions only they can answer.

**Status: nothing started. Runs after [58 phase 1](58-phase-1-notes-shown-and-wiki-extracts.md) has
landed. Waiting on the answers in § 8, then on the word "go".**

**Changed by phase 1 (2026-09-17).** This was plan 58 until the maintainer asked for two fixes to land
first: the note's own words shown under the reply, placed by code, and notes taken from wikis without
an AI rewrite. Those are phase 1. Four things here change because of it, and nothing else does: the
answers in § 8 now lock as **D112**; block 0 re-reads § 1 from the device, because phase 1 changes the
library and the reply; wave 2's note lanes use phase 1's reader instead of writing rewrites; and lane A
carries one steer from the same read. The rest of this plan is as it was written on 2026-09-16.

Read first: [CLAUDE.md](../../CLAUDE.md); the model table in [AGENTS.md](../../AGENTS.md) under "Which
model does which work"; [lessons-learned.md](../lessons-learned.md), especially § 1 on shared checkouts
and § 4 on briefing helpers; the roadmap's
[Knowledge base and RAG](../roadmap.md#knowledge-base-and-rag) section; and
[the status report](37-rag-status-report.md), which is the zoomed-out view behind it.

**The maintainer's own checklist of things only a person can judge lives here:**
[Twelve Checks Only You Can Do](https://claude.ai/code/artifact/3e5ec678-b219-439d-b952-139d75ff2db4).
Anything this session finds that needs their eyes or their finger goes on it.

---

## 1. What is true right now (checked 2026-09-16, nothing pressed)

- **The tree was clean** on the experimental branch at `04bfb6d` when this plan was started. While it was
  being written, another chat committed plan 57 (the reasoning display's build plan) and took decision
  number **D108** for it (`9a46331`). So this plan is 58 phase 2, and the answers to § 8 lock as **D112** — D109 and D110 went to the
  tab strip and the chip restyle the same day, and D111 is phase 1's —
  check the decisions tail again before writing it, in case another number has gone since.
- **The Deck was wiped at the end of the last session and the maintainer put it back together**: Ollama
  with the answering model and the note-searching model. Its Ollama was set up fresh today, which matters
  for the first item below. **Whether the knowledge base is on it is not settled:** the last session's
  log says it was downloaded again, and the honesty-line check that ran afterwards needed it; but the
  other chat's plan 57 commit says the SD-card copy still needs downloading. Block 0 reads it off the
  device rather than trusting either.
- **The roadmap's own "pick up here, in order" list is partly out of date.** Its step 4 — work out why
  the note search has been getting slower — is half answered, and the half that is answered never got
  written back in. On 12 September someone measured where the one-second wait on every question comes
  from: the Deck is set to hold one AI model in memory at a time, so the answering model and the
  note-searching model push each other out, and every question pays to load one back. With that raised
  to two, the search after a reply took **24 thousandths of a second instead of 732**, and both models
  fit with room to spare. **The other half is still open**, and the same reading says so in its own
  words: a reload that costs the same every question does not explain readings getting *slower over
  weeks*. That drift has no explanation yet.
- **Two entries in the section's Next list are built, and one of them does not work.** The prompt diet
  shipped on 6 September. The "not in my notes" line shipped on 7 September and **its device check
  failed the same day** — no question anyone tried could make it appear, because every question about a
  covered game attached a note. The search has gained a floor since, which can refuse a weak match, so
  the line may have a path now; nobody has checked. It is the same shape of problem as the *No tip for
  this* line, which is item 4 below. The two should be run together.
- **The plugin disagrees with itself about that setting.** The code that sets the Deck up when someone
  switches on *Run AI on this Deck* asks for **one** model in memory. The start-up service that keeps
  Ollama running asks for **two**, with a comment naming the measurement above. Which of the two the
  maintainer's Deck is actually running right now is not knowable from here — the wipe and the fresh
  setup may have written either. Block 0 reads it off the device before anything is decided.
- **The library is 293 notes over 25 games, plus 156 shared Deck tips.** The last published release is
  `2026.09.08`.
- **A publish step is still owed from two sessions ago.** A corrected note — a Hades boss whose name was
  spelled wrong — was built into a release that was never pushed, because the publish tool refuses to
  run for a session. One device row has been stuck behind it since 15 September. Anything this session
  writes needs the same step.
- **The headline search number is owed a re-take.** "The right note is in the top three 84 times in a
  hundred" was measured before the search gained its floor. Nobody has taken it since.
- **Nothing is waiting on the maintainer in the knowledge-base section today** except the follow-up
  question below, which has never been written up.

## 2. The candidates, and what happens to each

Ordered by what a person would notice, not by size. Stars and tags are the roadmap's.

| # | What a person gets | What is decided already | Lane | This session? |
|---|---|---|---|---|
| 1 | **The one-second wait before a game answer goes away.** Every question about a covered game pays about a second to reload the note-searching model. With both models allowed to stay, that second is gone. ★★★ `[KB]` | The cause of the per-question wait is measured and written down. What is left is a memory reading with a game running, one file made to agree with the other, and the maintainer's call. The separate question of why readings have drifted slower over weeks stays open either way. | B | **Yes, first** |
| 2 | **A follow-up stops naming the wrong boss.** Ask about a boss, then *"what about its second phase"* — one run in three still answers about a different boss. ★★★ `[KB]` | Nothing. This is the one open call. The search half works; the answer half does not. | A measures three ways to finish it; a wave-2 lane builds the winner if the call lands in time | **Yes, measured; built if you choose in time** |
| 3 | **Installing the library also gets you the meaning search.** Today a person can install the notes and silently get the weaker word-only half, with nothing but a one-time hint to tell them. ★★ `[KB]` | Decided 5 September: make the model pull part of the download, with consent, never silent. | D | **Yes** |
| 4 | **A troubleshooting answer with no tip says so.** The *No tip for this* line exists and no question anyone has tried can make it appear. ★★ `[KB]` | Nothing, and it is a fork: either the floor bites on tips, or the line is decoration and should go. | C | **Yes** |
| 5 | **More games answered properly** — wave four, writing notes. ★★★★ `[KB]` | Nothing: which games is your call (§ 8 question 4). | F and G write, H writes the blind questions | **Yes, if you pick the games** |
| 6 | **Numbers that can be trusted again**: the top-three search number re-taken on the floored search, and the count of questions the word search cannot answer at all. ★★ `[KB]` | Decided; it is owed measurement, not a decision. | E | **Yes** |
| 7 | **Four questions stop getting notes about the wrong subject** (taming a horse in Black Mesa, buying a house in Portal 2). ★★ `[KB]` | Known and held: catching them with the floor would throw away twenty right answers elsewhere. The real fix is note-writing. | rides F/G | **Partly** |
| 8 | **The five August device checks** closed or retired, including one row that contradicts a decision you already made. ★ `[KB]` | Needs your word on the contradiction (§ 8 question 5). | the session, on the Deck | **Yes** |
| 9 | **Spoiler coverage as a setting with tiers.** ★★★ `[KB]` | Tiers confirmed 1 September. About three days: settings plumbing, a prompt per tier, a control, device checks. | none | **No — its own session** |
| 10 | **Per-game Deck tips**, and the **"starting out"** card kind. ★★★–★★★★ `[KB]` | Both need a library format bump, which makes every installed library stale until re-downloaded. | none | **No — they ride one future release together** |
| 11 | **A bigger window for the model**, measured with a game running. ★★ `[KB]` | Agreed as "later, its own call". | none | **No, unless the Deck evening runs short** |

## 3. What to do first

1. **The tidy, twenty minutes, before anything else.** Two shipped items still read as not started, and
   the slowdown's cause is known but not written down. The bookkeeper fixes the roadmap section and the
   status report from a list. Nothing about the rest of the day is trustworthy until the list is true.
2. **The one-second wait.** It is the biggest thing on the list a person would feel, the cause is
   already measured, and the fix is making one file agree with another. It is also the cheapest.
3. **The follow-up measurement.** It is the only open call, and the decisions that have gone best on
   this project came with numbers attached rather than a written list of options.
4. **The library install pulling the meaning model.** Decided, small, and the wipe two days ago showed
   exactly what its absence costs.
5. **The no-tip line**, because it is a fork that only gets more expensive while it sits.
6. **Wave four notes and their blind questions**, once you have picked the games.
7. **The Deck evening**: the five August rows, the owed sightings, and the stuck release row.
8. **A release, only if notes land**, and only you can publish it.

**Directly answering your question:** not "decide how to finish follow-ups" on its own, and not the bugs
first either. Two of the roadmap's three "pick up here" steps are really *measure, then decide*, and the
measuring can run alongside the work that needs no decision at all. So the session opens with
measurements and decided build work in the same hour, and the follow-up call comes to you in the middle
of the day with numbers rather than at the start with a list.

## 4. Who does what

**The one running the session: Opus 5 at extra-high effort. Lanes: Sonnet 5 at high effort, five at
most at once.** That matches the routing table for ★★–★★★★ knowledge-base work. Fable is not needed —
nothing here is five stars.

- **The session writes no plugin code.** It writes briefs, measures on the Deck, reads diffs, lands
  commits one at a time with the gates after each, runs the device checks, reads failures, hands the
  bookkeeper lists, builds the release, and writes the report.
- **Lanes hand back code, notes, tests and one paragraph.** They never edit the roadmap, the testing
  documents or the changelog, never touch the Deck, never push. Each is cut from the tip in its own copy
  of the repo, prints and checks its base first, owns a named list of files, makes one change per commit
  with all five gates green, and skips its own package install because the copy's packages folder is a
  link into the shared checkout.
- **The bookkeeper** (Sonnet high) does every roadmap, testing, changelog and status-report edit from a
  list the session hands it, after each landing and after each block of device checks. It never invents
  a device result, and it does not commit while a landing is running in the shared checkout.
- **A read-only lookup helper** (Sonnet low) compiles, at the start, the list of knowledge-base device
  rows this session can actually run, so the session does not read the whole testing document itself.

**The one thing that cannot run side by side: this PC's AI model.** The answer test, the search test and
anything that builds the library all use the single Ollama on this machine. Two at once give wrong
timings and fight for memory, which is the same fault this session is trying to fix on the Deck. So the
session hands out **one model turn at a time**, the way it does with the Deck. A lane that needs a run
asks, waits, and writes its code while it waits. Five lanes can still be open; only one may be running
the model.

**Note-writing has its own rule, and it is old:** whoever writes a note may not write the question that
tests it. Lanes F and G write notes; lane H writes the blind questions; they must be different helpers
and must not read each other's work.

## 5. Order of work, and what runs side by side

### Block 0 — hygiene, the tidy, and four readings. The session alone, about an hour

1. Tree clean at the tip; the five gates green before anything changes; record the hash.
2. Check the planning folder and the decisions tail again for numbers another chat has taken.
3. Hand the bookkeeper the tidy list: the two shipped entries, the slowdown's known cause, the stale
   "pick up here" order, and the owed search number. One commit.
4. Back up the Deck's settings file, its saved chats and the knowledge-base flags over SSH. Hold the
   Deck awake. **Also record which library version is installed and where it lives** — the wipe moved
   it once already.
5. Deploy the tip once and prove it by hash.
6. **Four readings, evidence saved each time** (recipes in Appendix B):
   - **How many models the Deck's Ollama is allowed to hold**, read off the running process, plus free
     memory with a game running and both models loaded.
   - **The search time today**, three questions in a row after a reply, so the second is not a cold read.
   - **A follow-up pair reproduced**, with the notes that were attached recorded, so the three candidate
     fixes can be judged against a real failure rather than a remembered one.
   - **A troubleshooting question that should produce the no-tip line**, to see what it does instead.
7. Write the wave-1 briefs. Start the lookup helper on the device-row list.

### Wave 1 — five lanes on "go", and the session goes to the Deck

| Lane | Work | Owns, in words |
|---|---|---|
| A — The follow-up options, measured | Three ways to finish it, measured on the PC, nothing shipped | its own copy of the answer test and the follow-up memory; a scratch report |
| B — One model or two | Make the setup path agree with the start-up service, behind a memory check | the local Ollama setup service, the start-up service, their tests |
| C — The no-tip line | Either the tip floor bites, or the line is retired with the reason written down | the tip floor in the knowledge-base service, the no-tip notice, their tests |
| D — The library install pulls the meaning model | With consent, never silent, with a clear failure | the library download service, the Ollama tab's knowledge-base section, their tests |
| E — The numbers | Re-take the top-three search number on the floored search; re-count the questions only meaning search can answer | the search test script and its report format only |

**Lane A, in words.** It measures three finishes for the follow-up bug against the pair that fails on the
device, and hands back a table, not a change: (a) carry the remembered subject into the model's
instructions as well as into the search, so the reply is told which boss it is about; (b) drop the
runner-up note when the remembered subject already names one, so the wrong note is not in the prompt at
all; (c) send the previous question and the trimmed previous answer, which is the original plan and the
most expensive in a small window. Each is measured on the same questions, three runs, with the existing
checks. The lane changes no shipped behaviour. **Its report is what goes to the maintainer.** One steer
from the read behind phase 1: of the three, only (b) removes the wrong evidence rather than asking the
model to ignore it, and the production lesson that read came from predicts it closes more of the
remaining third than (a) or (c). The table decides, not the prediction; if two tie, take (b).

**Lane B, in words.** The comment in the start-up service already names the measurement. The work is:
read what a real Deck is running, make the setup path write the same value, guard it so a device with
too little free memory keeps the safer setting, and say in the plugin log which one it chose. The risk
is memory while a game is running, which is why block 0 reads that first and why the guard exists.

**Lane C, in words.** The no-tip line cannot fire because a plain word search over 156 tips nearly
always finds something, so it wins with a poor match and the line never gets a turn. The lane measures
whether a floor under the tip search can say "none of these fit" without losing the tips that are right
today, on the tuning sentences only. If it can, it ships and the line finally has a job. If it cannot,
the lane writes down why and the line is proposed for retirement — that is a real outcome, not a
failure.

### Wave 2 — as slots free

| Lane | Work | Cut after |
|---|---|---|
| F — Notes, first half | The games you pick, made with phase 1's reader from cleared wiki pages, no AI rewrite; the nine-field shape is unchanged | the games are chosen |
| G — Notes, second half | The other half of the games, a different helper from F | the same |
| H — Blind questions | Questions for the new notes, written without reading them, by a helper that has not seen F or G | F and G are open, never after they land |
| I — Follow-ups, built | The winner of lane A's table | your call on lane A's report lands |

Lanes F, G and I are cut only if there is time and, for I, only if the call has come. Lane H must start
while F and G are still writing, so the questions cannot be shaped by the notes.

### Landing — the session alone, between Deck blocks

Each lane's commits are read as diffs, then taken onto the branch one at a time, oldest first, with the
five gates after every one. The note lanes both edit the same library file, so they land one after the
other and the second is rebuilt and re-checked. One bookkeeper sweep per landing. Deploy after wave 1
has landed, after wave 2, and at the end — not after every commit.

### The release — only if notes land

Build the library, run its own publish check, install it on the Deck from the plugin's own button, and
ask one question per new game. **The push to the two public download hosts is yours to run** — the tool
refuses it for a session. The same step also unsticks the corrected Hades note that has been waiting
since 15 September.

## 6. The Deck work while lanes build

Rules first, all carried from the last two sessions and all still true:

- Save the evidence file before writing the row. No result is written until its file exists.
- A failure is written down with its file, not argued with. If the device contradicts the code, check
  the installed build's hashes before believing it.
- Settings go back the way they were found, read off disk to prove it, at the end of every block.
- Screenshots and recordings come from the repo's own two scripts; the rig's screenshot tool is broken.
- The plugin needs up to three open attempts after a deploy.
- A stop that is highlighted but hidden behind the dock is a failure, whatever the script says.
- Only one thing drives the Deck at a time.

**While wave 1 builds**, cheapest first:

1. The four block-0 readings above.
2. **The five August rows** — the format gate, the relevance floor, follow-ups searching your words,
   transparency matching what the model got, and the developer kill switch. Two of them need setting up
   first (an old-format library on the device; a game that writes a big log). The floor row needs your
   word before it can pass or fail at all: see § 8 question 5.
3. **More sightings of the follow-up menu fix** — the menu that used to offer places from a different
   game. One clean sighting exists; the fault was intermittent, so a handful more is the real proof.
4. **The spoiler-box rows** landed on 15 September and never checked on a device: a game known only by
   name, a question that names the boss first, and the same in copied text and read aloud.
5. **The "not in my notes" line, re-checked.** Its device check failed on 7 September because nothing
   could make it appear. The search has a floor now, so ask about a covered game in a way that should
   match nothing, and see whether the line finally shows. Run it in the same sitting as the no-tip line,
   since they fail the same way.
6. The knowledge-base rows the lookup helper's list turns up.
7. **After each landing batch is deployed:** the new rows — the search time re-read with the setting
   changed, the library install pulling the model, the no-tip line if it shipped, one question per new
   game — then the free-play sweep.

Rows this pass cannot run, and why: the download Cancel button (the download finishes in about a second,
so there is no window to press it in, and it needs a throttle first); the glossary tap and anything else
needing a finger; anything needing your eyes.

## 7. Rules for this session

1. One change per commit, behaviour preserved, the five gates green between commits.
2. Lanes hand back code, notes, tests and one paragraph. They never touch the roadmap, the testing
   documents or the changelog, never touch the Deck, never push.
3. Every lane prints and checks its base before doing anything, and skips the package install because
   the copy helper links the shared packages folder in.
4. **Only one thing runs this PC's AI model at a time**, and only one thing drives the Deck at a time.
5. A failure on the device is written down with its evidence file named, not argued with.
6. Settings go back the way they were found, read off disk, at the end of every device block.
7. Whoever writes a note may not write the question that tests it.
8. Do not sink time into something that turns out to be hard. Make a good effort, write down what was
   learned, move on.
9. Never stage everything at once in the shared checkout; another chat's unfinished work gets swept in.
10. Never remove a copy of the repo you did not make.
11. Do not start lanes just before the usage window resets.
12. Everything written to the maintainer, in chat or in this file, is in plain language.
13. The roadmap and the status report are brought up to date after every landing and after every block
    of device checks, by the bookkeeper, from a list — never left for the end.
14. Nothing starts until the maintainer says "go".

## 8. Questions for you — answers lock as D112

| # | Question | Why it matters | What I would do |
|---|---|---|---|
| 1 | **The one-second wait.** If the reading confirms it, do you want two models allowed to stay in memory for everyone, or only tried on your Deck first? | It is the biggest thing on this list a person would feel, and it costs memory while a game is running. | Ship it for everyone behind a memory check, after the block-0 reading with a game running says there is room. |
| 2 | **Follow-ups.** Do you want the three finishes measured this session and your call in the middle of the day, or the options written up and the building left for another time? | Measuring costs one model turn — minutes, not hours. Building it costs a lane. | Measure this session, decide from the table, build it in wave 2 if your call lands in time. |
| 3 | **The publish step.** A corrected note has been sitting in an unpublished release since 15 September, and anything written this session needs the same step. Will you run it, or do you want to authorise a session to? | One device check is stuck behind it, and wave four's notes reach nobody without it. | Either is fine; the command is in the last session's log. Say which so the plan does not assume. |
| 4 | **Wave four's games.** Depth on the 25 games the library already covers, or a first tranche of new titles you choose? | New titles need a rule reopened, and they are also the data a held search decision has been waiting for. | Five to ten new titles you pick, plus topping up the thinnest of the 25. Say which games and I will split them across two lanes. |
| 5 | **One device row contradicts a decision you already made.** The relevance-floor row says an unrelated question must attach nothing; on 27 August you accepted that unrelated questions do get a card stapled on. As written, the row can only fail. Retire that half of the row, or reword it? | It has been blocking a clean pass on five old rows. | Reword it to check the trust label reads honestly, and drop the "attaches nothing" half. |
| 6 | **The no-tip line.** If a floor under the tip search cannot make it appear without losing tips that are right today, do you want the line retired? | Otherwise it stays as decoration nobody can ever see. | Retire it, and say so in the changelog. |
| 7 | **How long, and is the Deck mine?** | The last two sessions ran a full day with the Deck held the whole time. | Say if another chat is driving it. |

## 9. Things to bring to your attention

- **Two of the roadmap's three "pick up here" steps are not what they say.** The slowdown was explained
  on 12 September and the explanation never made it back into the list, and two items in the same
  section's Next list shipped over a week ago. The first commit of the session fixes that.
- **The one-second wait looks like our own doing.** The plugin's setup asks the Deck to hold one AI
  model at a time. That is a reasonable choice on a handheld with shared memory, and it is also exactly
  why every game question pays about a second. The start-up service already asks for two, with a comment
  pointing at the measurement. Nobody reconciled the two files. This is a good outcome, not a bad one:
  the cause is known and the fix is small.
- **That is not the whole slowdown, and I do not want to oversell it.** The reading that found it says
  plainly that a reload costing the same on every question cannot explain readings getting slower over
  weeks. So fixing this removes about a second from every game question and leaves the drift unexplained.
  Both halves are in the roadmap now; only the first is in this session's plan.
- **The number everyone quotes is stale.** "Right note in the top three, 84 times in a hundred" predates
  the floor the search gained. Nothing should be decided from it until lane E re-takes it.
- **Wave four's notes reach nobody without you.** The publish tool refuses to run for a session, by its
  own permission rules. Writing notes is the cheap half; publishing is the half only you can do.
- **The follow-up bug has a floor.** One game — DOOM Eternal — is wrong every time, and no amount of
  work on the search closes that one; it needs notes. Whatever lane A recommends, expect the number to
  improve, not to reach a hundred.
- **Budget.** Five helpers at once, cut early in a usage window. The expensive part is the device work,
  one thing at a time by necessity. The PC's model is a second queue — name it in every brief, because a
  lane that runs the answer test while another is running it will report timings that are simply wrong.

## 10. Progress log

Nothing has run. The first entry goes here when block 0 starts.

---

## Appendix A — files each lane owns (for the briefs, not for reading)

Checked against the tree on 2026-09-16; each brief re-checks its list against the tip it is cut from. A
lane that truly needs a file outside its list says so in its report rather than sprawling.

| Lane | Files |
|---|---|
| A | `scripts/eval_kb_answers.py` and `tests/fixtures/kb_answer_eval.json` (new rows only), `py_modules/backend/services/kb_followup_memory.py` (read, and a switchable variant for the run only), a scratch report under `docs/test-evidence/` |
| B | `py_modules/backend/services/local_ollama_setup_service.py`, `py_modules/backend/services/ollama_local_autostart_service.py`, and their tests |
| C | `py_modules/backend/services/knowledge_base_service.py` (the tip floor only), `py_modules/backend/services/kb_not_in_notes_notice.py`, `py_modules/backend/services/compat_topic_router.py` (read), and their tests |
| D | `py_modules/backend/services/rag_corpus_download_service.py`, `py_modules/backend/services/ollama_embed_service.py` (read), `src/components/KnowledgeBaseSection.tsx`, `src/types/rpcMethods.ts`, `main.py` (one method), and their tests |
| E | `scripts/eval_kb_embed_models.py` and its report format only; no service file |
| F, G | `data/kb/strategy_seed.json` only |
| H | `tests/fixtures/kb_eval_v2.json` only |
| I | whichever of lane A's three finishes wins: `kb_followup_memory.py`, `game_ai_request.py` (the follow-up block only), `knowledge_base_service.py` (the ranking call only), and their tests |

Files that belong to the session and to no lane: the roadmap, the status report, the testing documents,
the changelog, this plan, and `scripts/publish_corpus.py`.

## Appendix B — the four block-0 readings, as recipes

1. **How many models the Deck holds.** Over SSH, read the environment of the running Ollama process and
   record the model limit. Then, with a game running, ask one game question, and read free memory and
   which models are loaded straight after. Save as `docs/test-evidence/plan58-M-deck-model-limit.json`.
   Outcome: the value the device is really running, and whether two models fit with a game up.
2. **The search time today.** Three game questions in a row in one chat, the second and third straight
   after a reply. Record the note-search time for each from the plugin log. Save as
   `docs/test-evidence/plan58-M-search-time-before.json`. Outcome: the "before" the change is judged
   against, taken on the device the maintainer actually uses.
3. **A follow-up pair reproduced.** With a game running that has several bosses, ask about one by name,
   then ask *"what about its second phase"*. Record which notes were attached and in what order, and
   what the reply named. Save as `docs/test-evidence/plan58-M-followup-pair.json`. Outcome: the real
   failure lane A measures its three finishes against.
4. **The no-tip line.** With nothing running, ask the plainest problem sentence that reaches the tip
   sheet and comes back with a poor match. Record what attached and whether any line appeared. Save as
   `docs/test-evidence/plan58-M-no-tip-line.json`. Outcome: whether the line has any question at all
   that can make it appear today.
