# 58 phase 1 — Show the note's own words, and take notes from wikis without rewriting them

Written 2026-09-17, before any code was started, at the maintainer's request. It came out of a read of
the knowledge base against a list of lessons from someone running this kind of system in production
for a year and a half. Two of those lessons land squarely on this plugin, and the maintainer asked for
both fixed **before** the wave-four session runs. That session is now
[58 phase 2](58-phase-2-kb-session-wave-four.md); it starts when this phase has landed.

**Status: answers in on 2026-09-17, locked as D111 (see the end of § 8). Two items stay open there:
the block's look waits on the drawings, and "trim only" stands unless the maintainer overturns it.
The maintainer said to take as long as needed and that nothing else is on the Deck. Block 0 is next.**

Read first: [CLAUDE.md](../../CLAUDE.md); the model table in [AGENTS.md](../../AGENTS.md) under "Which
model does which work"; [lessons-learned.md](../lessons-learned.md), especially § 1 on shared checkouts
and § 4 on briefing helpers; the roadmap's
[Knowledge base and RAG](../roadmap.md#knowledge-base-and-rag) section; and
[the status report](37-rag-status-report.md). Phase 2's § 1 holds the device state and still applies.

---

## 1. What a person gets, and why it comes first

**Today the model rewrites the note in its own words, and the person never sees the note.** The search
hands the model the note word for word and tells it to lead with the note's advice. Nothing makes the
reply keep the note's words, nothing checks afterwards, and the only trace on screen is a credit line
and a trust label under Show details. With the corrected checks, over three runs per question on the
Deck's own model:

| What was measured | Reading | Where from |
|---|---|---|
| The reply keeps the note's facts | 79.5 in 100 | answer test, 7 September |
| The reply contradicts its own note | 9.3 in 100 | same run |
| Notes written as labelled lines keep their labels | 1 in 6 | Deck, August |

The clearest case is the Pikmin 2 day limit. The note says there is no day limit. The model's own
memory says there is, so it contradicts the note on every run, in both reply shapes tried. No prompt
wording has fixed it. **The fix is to let code place the note's own words on screen**, under the
reply, filled from what the search attached rather than from anything the model wrote. Then the
note's facts reach the person every time, by construction, and a contradiction is visible instead of
hidden. The same block does the most good for troubleshooting tips, where a launch option or a
setting name should arrive exactly as written.

**Today every note was written by an AI, and none of it is the wiki's own words.** Counted on
2026-09-17:

| Notes | How they were made |
|---|---|
| 194 of 293 | An AI helper fetched a wiki page, rewrote it in its own words, and recorded the page, its licence and the day. The maintainer checked them. |
| 99 of 293 | An AI wrote them from its own memory, no page behind them, because the game had no usable wiki. The maintainer checked them. |
| 159 of 159 tips | Same as the 99. A few came from the maintainer's own Deck answers. |

That is one game at a time, about a day per game for six to ten notes, plus the maintainer's check.
At that rate the thousand-game target is years away. **The fix is to take the wiki's own sentences,
cut to length by code, credited, with no AI rewrite.** The AI keeps two jobs: choosing which pages
and sections matter, and trimming when a section runs long. It never writes a fact. This is cheaper
per game by a large factor, it adds no AI reasoning to the library, and the licence is satisfied by
the credit line the plugin already prints.

**What this phase delivers, in order of what a person notices:**

1. A "From the notes" block under a reply, showing the note the answer was built on, in the note's
   own words, placed by code. Hidden inside the same spoiler box as the reply when the reply is
   fenced. Says where the note came from: a named wiki, or bonsAI's own notes with no source.
2. A reader that turns a wiki page into notes without rewriting it, proven on a sample page from
   each wiki with the maintainer reading the page next to its output before any note is written.
3. Hollow Knight done both ways, on the same questions: the fourteen AI rewrites that ship today
   against fourteen notes cut from the same fourteen pages by the reader. The numbers decide which
   set ships.
4. Ten new games from sources already cleared, with no AI rewrite. Blind questions for three of
   them, written by a helper who has not seen the notes.
5. A short study of which sources cover many games under one licence, for the catalog that comes
   after. One licence check per source instead of one per game.
6. A release carrying the new notes. The push is the maintainer's.

**What this phase does not do:** build the catalog, change the search, change the prompt, touch
follow-ups, or run any of phase 2. It changes how notes are made and how one of them is shown.

## 2. What is true right now (checked 2026-09-17, nothing pressed)

- **The tree was clean** on the experimental branch at `ac9f235`. The last commit is the plan 60
  docs sweep. The latest locked decision is **D110**, so this plan's answers lock as **D111** and
  phase 2's move to **D112** — check the decisions tail again before writing either.
- **The person never sees a note's text.** Show details prints which search ran, the trust tier as a
  raw word, timings and a credit line with the notes' titles. The reply body is the model's rewrite.
- **The three honesty lines are decided by code, after the model has finished**, from what the
  search found. That part already matches the production lessons and stays as it is.
- **The page reader has already failed once the way a reader fails.** The first version skipped
  Fandom's tab boxes and returned empty pages until it was fixed. A Hades boss whose name came out
  misspelled broke the search for that boss until 15 September. Both are parsing failures.
- **The licence rules are settled and enforced.** The library is one share-alike work; a note from
  a page must name the page, the licence with its version, and the day it was read; the publish
  step accepts four licences and refuses everything else; every wiki cleared so far is listed with
  its evidence in the archived licensing plan. Verbatim reuse with credit is the plainest case a
  share-alike licence covers, so this phase raises no new licence question. The per-note licence
  stays the one that counts for reuse.
- **A rule from July froze the game list** until the catalog phase. It was reopened once, on
  5 September, for eleven games. This phase adds ten more and asks to reopen it again (§ 8).
- **Sources already cleared that cover games not yet in the library:** the Super Mario Wiki
  (share-alike 4.0, read live 5 September) covers the Nintendo 64 and GameCube shelves; SmashWiki
  (share-alike 4.0) covers the first Smash game; the GTA wiki (share-alike 3.0) covers GTA III.
  All three were checked at the source in September and need no new check.
- **Hollow Knight is the cleanest before-and-after.** Its fourteen notes all cite a page on the
  Hollow Knight wiki (share-alike 3.0, the freshest and largest source in the library), and it has
  six blind search questions and its own answer-test rows already.
- **Two wikis block automated reads.** Fandom refuses reads from inside the coding tool and answers
  a plain request from the maintainer's PC. The general walkthrough wiki at strategywiki.org refused
  both today, from the tool and from the PC, behind a bot check. **Its licence is confirmed anyway:**
  the maintainer read its page footer in a browser on 2026-09-17, and it reads "Content is available
  under Creative Commons Attribution-ShareAlike 4.0 unless otherwise noted." That is share-alike 4.0,
  usable, recorded as footer evidence with the date. Its pages will need an archive dump or a browser
  read until the bot check lets a script through.
- **The Deck state is phase 2's § 1.** The publish step for the corrected Hades note is still owed,
  and anything this phase writes needs the same step.
- **The blind-question rule stands:** whoever makes a note may not write the question that tests it.
  Here the reader lane makes the notes; a different helper writes the questions without seeing them.

## 3. What to do first

1. **Block 0, the session alone:** hygiene, numbers, the bookkeeper's pointer edits, the four
   readings below. About an hour.
2. **The block's mockups.** Three drawings at true size from the real code on one page, the maintainer
   picks one. No block is built before the pick (the lesson from every UI change this month).
3. **The reader**, with a sample page per wiki shown to the maintainer before any note is written.
   This is the parsing check the production lessons put first, and the tab-box failure says why.
4. **Hollow Knight both ways.** Numbers first, then the maintainer's read on the Deck.
5. **The ten games**, once the reader's sample is approved and the lock is reopened.
6. **The source study** runs alongside, read-only, and costs nothing on the PC's model.
7. **The Deck evening**: the block's rows, one question per new game.
8. **The release**, then phase 2.

## 4. Who does what

**The one running the session: Opus 5 at extra-high effort. Lanes: Sonnet 5 at high effort, five at
most at once.** Fable wrote this plan. The routing table lets the session that planned six-star scope
run the lanes it planned, so on 2026-09-17 the same Fable session at extra-high effort started block 0
rather than handing off; if the maintainer prefers a fresh Opus session, the plan is written for one.
The block is two to three stars, the reader and the notes are three to four.

- **The session writes no plugin code.** It writes briefs, lands commits one at a time with the gates
  after each, runs the device checks, reads failures, hands the bookkeeper lists, builds the release,
  and writes the report.
- **Lanes hand back code, notes, tests and one paragraph.** They never edit the roadmap, the testing
  documents or the changelog, never touch the Deck, never push. Each is cut from the tip in its own
  copy of the repo, prints and checks its base first, owns a named list of files, makes one change
  per commit with all five gates green, and skips its own package install because the copy's
  packages folder is a link into the shared checkout.
- **The bookkeeper** (Sonnet high) does every roadmap, testing, changelog and status-report edit
  from a list, after each landing and after each block of device checks. It never invents a device
  result and does not commit while a landing is running in the shared checkout.
- **A read-only helper** (Sonnet low) does the source study. It reads licences at the source where
  the source answers, and writes "could not read" where it does not. It never assumes a licence.

**The one thing that cannot run side by side: this PC's AI model.** The answer test, the search test
and every library build use the single Ollama on this machine. The session hands out one model turn
at a time. A lane that needs a run asks, waits, and works on something else while it waits.

**The maintainer's own jobs in this phase, none of which a helper can do:** pick the block's drawing;
read one sample page per wiki next to the reader's output and say yes or no; read the Hollow Knight
notes both ways on the Deck; open the walkthrough wiki in a browser and say what its footer and its
licence page read; run the publish step.

## 5. Order of work, and what runs side by side

### Block 0 — hygiene, numbers, the tidy, and four readings. The session alone, about an hour

1. Tree clean at the tip; the five gates green before anything changes; record the hash.
2. Check the planning folder and the decisions tail again for numbers another chat has taken.
3. Hand the bookkeeper the pointer list: the roadmap's "pick up here" order gains this phase as the
   step before wave four; the wave-four link moves to the renamed file; the status report gets one
   line. One commit.
4. Back up the Deck's settings file, its saved chats and the knowledge-base flags over SSH. Hold the
   Deck awake. Record which library version is installed and where it lives.
5. Deploy the tip once and prove it by hash.
6. **Four readings, evidence saved each time** (recipes in Appendix B):
   - **The Pikmin 2 day-limit question on the Deck today**, so the block's first row has a real
     "before": what the reply says, and that nothing on screen shows the note.
   - **A fenced boss question**, to record how the spoiler box looks today, so the block's fenced
     drawing is drawn from a real screen.
   - **A tip question**, to record how a troubleshooting reply reads today, for the tip block's row.
   - **One Hollow Knight question**, for the maintainer's "before" read.
7. Write the wave-1 briefs. Start the source-study helper.

### Wave 1 — three lanes on "go"

| Lane | Work | Owns, in words |
|---|---|---|
| A — The "From the notes" block | Mockups first: one page, three drawings at true size from the real code, plus one of a tip. Build only after the maintainer's pick. | the reply's result fields and the live-stream snapshot, the answer bubble, the block's source label, their tests, the mockup page |
| B — The wiki reader | A script that turns a page into note-shaped pieces without rewriting; a side-by-side sample per wiki for the maintainer | the two page fetchers, the new reader, their tests; no seed edits |
| C — The source study (read-only) | Which sources cover many games under one licence, for the catalog | one new research note under the archive's research folder |

**Lane A, in words.** The block's text comes from the search's result and from nowhere else. A test
proves the block's text equals the attached note's text. It is published into the live stream so it
can appear before the model's first word, not only when the reply completes — the lesson the spoiler
work paid for in September, when a per-turn fact reached the screen only at the end and the live
bubble flickered. When the turn's spoiler rule fences the reply, the block sits inside the same box.
The header names the source in everyday words: "From the Hollow Knight wiki", "From the shared Deck
tips", "From bonsAI's own notes, no source". The trust tier already tells those apart; the header
turns it into words. Nothing about the search, the prompt or the honesty lines changes.

**Lane B, in words.** Given a page, from the live wiki or an archive dump, the reader picks the
section that holds tactics or use, keeps its sentences, cuts to the note length by code, and writes
the page, the licence with its version, the revision and the day, the way the live fetcher already
records them. A table row becomes one labelled line. Info boxes and tab boxes are read, not skipped.
**Every sentence in the output must be a sentence from the page**, and a test refuses any that is
not — prove the test by feeding it one rewritten sentence and watching it fail, and name that in the
commit. The lane prints one sample page per wiki as a side-by-side for the maintainer and stops
there. It writes nothing into the library.

**Lane C, in words.** For the games on the maintainer's own shelves and the most-played games on the
Deck, which cleared source covers each, and which one licence check would cover the most games. The
walkthrough wiki at strategywiki.org is named as the candidate that covers thousands of games, with
its licence recorded as share-alike 4.0 from the footer the maintainer read on 2026-09-17, and a note
that scripted reads are refused by a bot check, so the study says how its pages can be fetched: an
archive dump, or a browser. Any other wiki that refuses a read is written down as refusing, not guessed.

### Wave 2 — after the maintainer approves lane B's sample

| Lane | Work | Cut after |
|---|---|---|
| D — Hollow Knight both ways, then ten games | The fourteen pages read again; a scratch library with the rewrites replaced; the search and answer tests on both; then the ten games' notes into the seed with credit lines | the sample is approved and the lock is reopened |
| E — Blind questions | Questions for three of the ten games, written without reading D's notes, by a helper that has not seen D | D is open, never after it lands |

**Lane D, in words.** First the before-and-after (Appendix C). Then the ten games: eight from the
Super Mario Wiki (Mario Party 1, 2, 3, 6 and 7, Donkey Kong 64, Yoshi's Story, Diddy Kong Racing),
the first Smash game from SmashWiki, and GTA III from the GTA wiki. For each game the lane lists the
pages it will read before reading them, confirms each page exists on that wiki, runs the reader, and
writes the notes with the reader's own credit fields. A game that yields fewer than three usable notes
is skipped and named in the report; that is a real outcome, not a failure. The lane changes the test
that pins the count of labelled notes, because wiki notes made from table rows are labelled lines,
and says so in the commit. It never writes a question.

### Landing — the session alone, between Deck blocks

Each lane's commits are read as diffs, then taken onto the branch one at a time, oldest first, with the
five gates after every one. Lane D's notes land last, and the library is rebuilt and re-checked after
them. One bookkeeper sweep per landing. Deploy after wave 1 has landed and after wave 2.

### The release, on disk only

Build the library, run its own publish check, install it on the Deck from a local folder through the
plugin's own install path, and ask one question per new game. **Nothing is pushed to the public
download hosts in this phase.** The maintainer said on 2026-09-17 that the publish call comes later and
the work is to improve what is on disk. The corrected Hades note still waits on that same call.

## 6. The Deck work while lanes build

Rules first, all carried from the last three sessions and all still true:

- Save the evidence file before writing the row. No result is written until its file exists.
- A failure is written down with its file, not argued with. If the device contradicts the code, check
  the installed build's hashes before believing it.
- Settings go back the way they were found, read off disk to prove it, at the end of every block.
- Screenshots and recordings come from the repo's own two scripts; the rig's screenshot tool is broken.
- The plugin needs up to three open attempts after a deploy.
- A block or a stop that is drawn but hidden behind the dock is a failure, whatever the script says.
- Only one thing drives the Deck at a time.

**Before wave 1 lands:** the four block-0 readings, and the free-play sweep on the current build.

**After wave 1 lands and is deployed, the block's rows:**

1. **Pikmin 2, the day limit.** With Pikmin 2 running, ask about the day limit in Strategy mode. The
   block under the reply shows the note's own words, which say there is no day limit, whatever the
   reply says. Screenshot.
2. **A fenced boss.** With a story-protected game running and no spoiler opt-in, ask about a boss by
   its role, not its name. The block sits inside the same spoiler box as the reply and is not readable
   until the box is opened. Screenshot both states.
3. **A tip.** With nothing running, ask a troubleshooting question that reaches a tip. The block shows
   the tip's own words, and any launch option or setting name in it matches the tip exactly.
4. **Nothing attached.** Ask a covered game something the notes cannot answer. No block; the honesty
   line shows instead. The two never appear together.
5. **A note with no source.** With Hades running, ask about a boss. The block's header reads that
   this is bonsAI's own note with no source.
6. **The block appears before the first word.** Watch one Strategy question from the press of Ask: the
   block is on screen before the reply starts streaming, not after it completes.
7. **Read aloud.** With voice replies on, the block is not read out unless the maintainer says it should
   be (§ 8). Whatever the answer, the row checks it.

**After wave 2 lands and the release is installed:** the Hollow Knight read by the maintainer, one
question per new game, then the free-play sweep.

Rows this pass cannot run, and why: anything needing a finger; anything needing the maintainer's eyes,
which goes on their own checklist.

## 7. Rules for this session

1. One change per commit, behaviour preserved, the five gates green between commits.
2. Lanes hand back code, notes, tests and one paragraph. They never touch the roadmap, the testing
   documents or the changelog, never touch the Deck, never push.
3. Every lane prints and checks its base before doing anything, and skips the package install because
   the copy helper links the shared packages folder in.
4. **Only one thing runs this PC's AI model at a time**, and only one thing drives the Deck at a time.
5. A failure on the device is written down with its evidence file named, not argued with.
6. Settings go back the way they were found, read off disk, at the end of every device block.
7. **No AI-written sentence enters a wiki note.** Trim only. The test that enforces it is proven by
   breaking it before it is trusted.
8. **The block never shows text that did not come from the search's result.**
9. A note's page, licence and day are written by the reader on the day it reads them. Nobody types them.
10. Whoever runs the reader on a game may not write that game's questions.
11. Do not sink time into something that turns out to be hard. Make a good effort, write down what was
    learned, move on.
12. Never stage everything at once in the shared checkout; another chat's unfinished work gets swept in.
13. Never remove a copy of the repo you did not make.
14. Do not start lanes just before the usage window resets.
15. Everything written to the maintainer, in chat or in this file, is in plain language.
16. The roadmap and the status report are brought up to date after every landing and after every block
    of device checks, by the bookkeeper, from a list — never left for the end.
17. Nothing starts until the maintainer says "go".

## 8. Questions for you — answers lock as D111

| # | Question | Why it matters | What I would do |
|---|---|---|---|
| 1 | **The block's shape.** After the three drawings: closed by default under a one-line header that names the source, open by default, or open only when the reply is short? | It is on every Strategy and troubleshooting reply with a note, on a 412-pixel-wide transcript. | Closed by default, one line, the note's name and its source in the header. The drawings decide; say which. |
| 2 | **Trim only, or a labelled summary?** May the AI add one labelled line of its own above the wiki's sentences, or is the rule no AI words at all? | "Trim only" is the rule that makes the verbatim test possible. A summary line reopens the rewrite door. | Trim only. If a page's section is too long to cut cleanly, the reader takes its first sentences and says so. |
| 3 | **Reopen the July lock for these ten games?** It says no new games until the catalog phase. | The ten are the proof that one cleared source can yield many games cheaply, which is the catalog's first step. | Yes, and say in the decision that the catalog phase starts here rather than later. |
| 4 | **The ten games.** Mario Party 1, 2, 3, 6 and 7, Donkey Kong 64, Yoshi's Story and Diddy Kong Racing from the Super Mario Wiki; the first Smash game from SmashWiki; GTA III from the GTA wiki. Swap any? | They are all on your shelves and their sources are already cleared, so no new licence check. | Take them as listed. Drop any you do not play. |
| 5 | **The walkthrough wiki's licence.** Will you open strategywiki.org in a browser and say what its page footer and its licence page read? | It is the one source that covers thousands of games. Both automated reads were refused today. Silence means all rights reserved. | Read the footer and the licence page; write both down with the date, and I will file them. |
| 6 | **The 99 notes and 159 tips written from memory.** Keep them, labelled as bonsAI's own notes with no source, or retire the ones for games that now have a wiki source? | Some are good. The block makes their nature visible to the reader either way. | Keep them all this phase. The ones with a usable wiki get replaced by the reader in the catalog work, not now. |
| 7 | **Read aloud.** Should the block be read out with the reply, or stay on screen only? | Reading a whole note aloud doubles the spoken length. | Screen only. |
| 8 | **The publish step.** Will you run it, or authorise a session to? | The ten games and the Hades fix reach nobody without it. | Either is fine; say which so the plan does not assume. |
| 9 | **How long, and is the Deck yours?** | The last three sessions ran a full day with the Deck held the whole time. | Say if another chat is driving it. |

**Answered 2026-09-17, locked as D111.** The maintainer's own words are quoted where they gave them.

1. **The block's look: not answered yet, by design.** The maintainer's reply was that they did not
   know what was being asked, which is fair: the question cannot be answered without seeing the
   block. Lane A draws it first, the maintainer picks a drawing, and that pick is added to D111.
2. **Trim only: stands unless overturned.** The maintainer asked back whether this meant the AI may
   not create facts, or whether it may riff off the notes. Both, in different places. In the reply,
   the model still riffs off the notes it is given; that does not change. In the library, an AI may
   never write a sentence into a wiki note. It may only cut. Trim only stands unless the maintainer
   says otherwise before lane B is briefed.
3. **Reopen the July lock: "Yes."** The catalog starts here.
4. **The ten games: "Add them, but verification of their facts might need to come from the feedback
   thumbs."** All ten are in. The maintainer does not expect to check each wiki note by hand; a
   thumbs-down that stops a wrong note coming back is the check they have in mind. See § 9.
5. **The walkthrough wiki's licence:** the maintainer read the footer on 2026-09-17: *"Content is
   available under Creative Commons Attribution-ShareAlike 4.0 unless otherwise noted."* Usable.
6. **Keep the 99 notes and 159 tips: "Yes."** Labelled as bonsAI's own notes with no source.
7. **Read aloud: "Screen only."**
8. **The publish step: "I'll decide that later, you just work on improving it on disk."** This phase
   builds the library and installs it on the Deck from a local folder. Nothing is pushed.
9. **Time and the Deck: "Take as long as you need, nothing else is going on."** No time limit; the
   Deck is free.

## 9. Things to bring to your attention

- **Checking wiki notes' facts is not a job the maintainer will do by hand.** Their answer on the ten
  games was that verification might need to come from the feedback thumbs. A thumbs-down that stops a
  wrong note coming back is the Phase 7 "demote" entry on the roadmap, about three days, and it is not
  in this phase. It should be the next build after phase 1, before the catalog grows past what one
  person can read.
- **Verbatim notes may read worse than the rewrites.** Wiki prose is longer, less tidy and sometimes
  written for someone who already knows the game. The Hollow Knight numbers decide, not taste. If the
  verbatim set scores worse on the same questions, the reader still ships as the fetch-and-credit half
  and the rewrites continue, with the block making their nature visible. That would be a real result.
- **Wiki quality is uneven, and thin games yield few notes.** The Mario Party pages are mostly board
  and minigame lists. A game that yields fewer than three usable notes is skipped and named. Expect
  the ten to come out as six to ten.
- **The reader is where the production lessons say most failures start.** Tables, info boxes,
  multi-column pages and tab boxes. That is why the sample-page read by the maintainer is a gate and
  not a courtesy, and why it runs before any note is written.
- **This does not change what the model is told or how the search works.** Every number in the
  answer test and the search test is comparable before and after this phase, except where the
  Hollow Knight notes are replaced, and that swap is measured on purpose.
- **The follow-up call in phase 2 gets one steer from this read.** Of the three finishes phase 2's
  lane A measures, only "drop the runner-up note when the memory already names the subject" removes
  the wrong evidence rather than asking the model to ignore it. Phase 2 measures all three as planned;
  a line there now says which one the lesson predicts.
- **Size is not a blocker for the catalog.** Ten thousand short notes with their meaning vectors is
  roughly forty megabytes by arithmetic, not measured. The old five-gigabyte figure assumed whole
  pages. And the search only ever looks inside the running game's notes, so a bigger library does not
  make a question slower.
- **Licence, said plainly.** Copying a wiki's sentences with credit is the case a share-alike licence
  is written for. The library stays one share-alike work, the per-note licence stays the one that
  counts for reuse, and the credit line under the reply already prints the page, the licence and the
  day. The attributions file's header should say that some notes are the wiki's own words and some
  are adaptations; the bookkeeper adds that line at the release.
- **Budget.** Five helpers at once, cut early in a usage window. Lane D is the expensive one: two
  library builds and two test runs on the PC's model, one turn at a time. Lane C is nearly free.

## 10. Progress log

- **2026-09-17, block 0 started.** Tree clean at `a66d019` on experimental (the answers commit). The
  Python gate green on the docs; the other gates were not run for docs-only commits. Decision numbers
  re-checked: D111 written, nothing else taken since. Three copies of the repo cut from `a66d019` for
  lanes A, B and C, and all three started. **The Deck is asleep or off the network**: it did not
  answer over the network, and one Steam-button press through the bridge board did not wake it. The
  four block-0 readings, the backup and the deploy wait on the maintainer pressing the power button.
  No lane needs the Deck, so the day carries on without it.
- **2026-09-17, wave 1, three landings.** Lane E was cut early, before any note existed, which is
  the cleanest blind there is: 24 questions for Donkey Kong 64, Diddy Kong Racing and Yoshi's Story,
  landed with the five gates. Lane A's drawing page landed and was published for the maintainer;
  the helper recommends closed by default. Lane C's source study landed: the Super Mario Wiki
  first, the per-wiki Fandom check second, the walkthrough wiki third from its saved copy of
  28 August 2025 (its own records agree with the maintainer's footer read); the Elder Scrolls wiki
  is share-alike 2.5, not 4.0 as an older note said; doomwiki.org now refuses scripted reads. Lane
  B, the reader, still running. The Deck still asleep. The maintainer's pick on the block is owed.
- **2026-09-17, lane B landed, second pass started.** The reader, 86 tests including the one that
  proves the "never rewrite" rule by feeding it a made-up sentence, and one sample page per wiki,
  landed as three commits with the gates after each. What the sample showed: the tactics heading
  the reader looks for exists on one wiki in five (Hollow Knight). The Super Mario Wiki keeps the
  fight under "History", the GTA wiki under "Mission" with an empty "Walkthrough" above it,
  SmashWiki under "Attributes", the walkthrough wiki under the stage name. The fallback took the
  first section with words and said so; two of those notes read well, one (GTA) is only an info
  box and would be a step back, two are in between. Two real bugs found and fixed by the sample
  itself: an empty heading used to win, and a page from a saved copy got the wrong address. The
  walkthrough wiki's saved copy from 28 August 2025 was read; its own records say share-alike 4.0.
  Lane B is on a second pass: a per-wiki heading rule, the note's kind read from the page's own
  categories, invisible marks trimmed, proven on twelve more pages. The sample page was rendered
  and published for the maintainer's yes or no per wiki.
- **2026-09-17, second pass landed, comparison lane cut.** The reader now tries a heading rule per
  wiki before the general list, reads a note's kind from the page's own categories, and trims
  invisible marks; twelve more real pages read through it: nine good enough for a player, two
  half (Smash jargon, a vehicle's fact box), one with nothing usable on the page (a Yoshi's Story
  enemy). Landed as three commits with the gates. Lane D cut from that tip for the Hollow Knight
  comparison only: the same fourteen notes made both ways, measured on the six blind questions
  and the two answer rows, with the swap held in its own commit until the maintainer picks. The
  ten new games wait on the maintainer's yes or no per wiki. Lane A is building the block, closed
  by default behind one switch. The Deck still asleep after a 25-minute poll.
- **2026-09-17, the block landed.** Two commits, 33 new tests: the attached notes ride with the
  turn (the live snapshot, the finished result, the saved chat), and the transcript shows one
  line under the reply naming the note and its source, opening to the note's own words, never
  read aloud, nothing when nothing attached. Two pieces short of the plan, sent back to the same
  lane with the extra files allowed: the block appears when the reply completes rather than
  before the first word, and a fenced reply hides it entirely instead of holding it inside the
  spoiler box. One gap found on the way, not fixed: the credit line's list silently drops every
  note with no source page, so tips and the memory-written notes have never been credited; filed
  as a bug. The focus checker's baseline gained two entries for the new control, matching a
  pattern the reply's other stops already carry; the device walk is the proof, not the baseline.
- **2026-09-17, Hollow Knight both ways: the verbatim notes lost, and the cause is named.** Nine
  of the fourteen pages had a section worth swapping to; five did not (their content sits under
  headings the reader does not know yet, or the page has none). On the six blind questions,
  eight of the nine swaps moved nothing; the False Knight question went from the right note
  first to out of the top three, and its answer row went from the two expected facts kept three
  times in three to none in three. Both facts are on the page, in the section the reader chose,
  past the 880-character cap: the section opens with the attack list and puts "how to beat it"
  last, and the excerpt never says where the boss is, which the page's lead sentence and the
  rewrite both do. Whole-library search: 84.0 to 83.3 in a hundred, inside noise. The swap is
  held in its own commit off the branch; the report landed. The reader lane is on a third pass:
  the page's lead sentence first, then the tactics sentences chosen by a visible word list and
  kept in page order, the two heading misses fixed, captions and file links dropped. Same cap,
  same trim-only law. Lane D re-measures after it lands. If it still loses, the rewrites stay
  and the reader ships as the fetch-and-credit half, as § 9 said.
- **2026-09-17, the block's two follow-up pieces landed.** The attached notes now travel in the
  same poll answer that already carries the named subject, so the line under the reply is on
  screen before the model's first word, and the handoff to the finished reply is tested for no
  flicker. On a fenced reply the block now appears only once the spoiler cover is open, driven by
  a live count of open covers rather than a guess from the reply's text, and hides again when
  the cover closes. One thing still short of drawing 3: the block sits in its usual place under
  the reply, next to Show details, rather than drawn inside the spoiler's own box; that needs
  the file that builds the bubble, which no lane has been given. Left for the Deck evening to
  judge on screen before anyone spends more on it. The lane also had to reach three files past
  its list to follow the poll field to the screen, and said so.

---

## Appendix A — files each lane owns (for the briefs, not for reading)

Checked against the tree on 2026-09-17; each brief re-checks its list against the tip it is cut from. A
lane that truly needs a file outside its list says so in its report rather than sprawling.

| Lane | Files |
|---|---|
| A | `py_modules/backend/services/game_ai_request.py` (the block field beside the honesty lines only), `py_modules/backend/services/background_request_state.py` (the live-stream snapshot field), `py_modules/backend/services/transparency_service.py` (read), `py_modules/backend/services/knowledge_base_service.py` (read; the attached cards are already in the retrieval result), `py_modules/backend/services/spoiler_risk_service.py` (read), `src/components/MainTabChatTranscript.tsx`, `src/components/MainTabBonsaiAiMarkdownChunk.tsx` (read), `src/utils/inputTransparency.ts`, `src/types/rpcMethods.ts` (only if a field is added), their tests, and a mockup page under `docs/planning/assets/` |
| B | `scripts/extract_wiki_notes.py` (new), `scripts/fetch_wiki_live_pages.py`, `scripts/fetch_wiki_dump_pages.py`, their tests, `tests/test_source_attribution.py` (read), `scripts/publish_corpus.py` (read) |
| C | `docs/archive/research/kb-catalog-sources-2026-09.md` (new) only |
| D | `data/kb/strategy_seed.json`, the one labelled-count line in `tests/test_knowledge_base_service.py`, a scratch report under `docs/test-evidence/`; scratch library builds under `build/`, never committed |
| E | `tests/fixtures/kb_eval_v2.json` only |

Files that belong to the session and to no lane: the roadmap, the status report, the testing documents,
the changelog, this plan, phase 2's plan, and `scripts/publish_corpus.py`.

## Appendix B — the four block-0 readings, as recipes

1. **Pikmin 2 today.** With Pikmin 2 running, Strategy mode, ask whether there is a day limit. Save
   the reply, the attached note from the plugin log, and a screenshot as
   `docs/test-evidence/plan58p1-M-pikmin-before.json`. Outcome: the "before" for block row 1.
2. **A fenced boss today.** With a story-protected game running and no opt-in, ask about a boss by
   role. Screenshot the closed and opened spoiler box. Save as
   `docs/test-evidence/plan58p1-M-fenced-before.json`. Outcome: the real screen lane A draws from.
3. **A tip today.** Nothing running, one plain problem sentence that reaches a tip. Save the reply and
   the attached tip as `docs/test-evidence/plan58p1-M-tip-before.json`. Outcome: the tip block's "before".
4. **Hollow Knight today.** With Hollow Knight running, one boss question. Save the reply and the
   attached notes as `docs/test-evidence/plan58p1-M-hk-before.json`. Outcome: the maintainer's
   "before" read.

## Appendix C — Hollow Knight both ways, as a recipe

1. Read the fourteen pages the shipping notes cite, live, with revision and date. If a page is gone,
   use the archive dump and say so.
2. Run the reader on each. Keep the same fourteen names where the page has a tactics or use section;
   where it does not, write "no section" and leave that note as it ships.
3. Build a scratch library with the fourteen replaced. Never commit it.
4. Run the search test on the six Hollow Knight blind questions and the answer test on its rows,
   three runs each, one model turn at a time, on the shipping library and on the scratch one.
5. One table: right note in the top three, right note first, facts kept, contradictions, before and
   after. The session reads it and the maintainer decides which set ships. Whichever ships, the
   table goes in the status report.

## Appendix D — the block's mockup page

One page, drawn at true size from the real transcript code, 412 pixels wide, on the Deck's dark theme:

1. A Strategy reply with the block closed: one line under the reply, the note's name and "From the
   Hollow Knight wiki".
2. The same reply with the block open: the note's own words, labelled lines kept as lines.
3. A fenced reply: the block inside the spoiler box, closed, then opened.
4. A troubleshooting reply with a tip block open.

The page goes to the maintainer before any code, the way the tab strip and the chip restyle went. A
drawing that shows two effects on one edge is checked as a pair before it is offered.
