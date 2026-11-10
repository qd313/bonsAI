# 103 — The knowledge base, wave six: finish the three half-done entries, notes for every game, honest answers, pictures that find their notes, versus and mod basics, and every open bug, with the Deck checked as the work lands

Written 2026-11-09 (evening) by the session on the maintainer's PC (Fable, the maintainer's choice; at max effort while
planning). Sources: the knowledge-base roadmap and its long notes at tip `3d86f5b7`, plan 98 (the shape copied here),
plans 100 and 102 and their reports, plans 17, 28, 37 and 101, the lessons file, the bug-wave runbook, the Deck tools
project at version 0.3.12, and six read-only code lookups by Sonnet helpers, each spot-checked against the code before a
brief was written (§ 8 lists what they corrected). Plain language on purpose: this file is for the maintainer first.

**Status: READY, waiting for "go".** The maintainer answered eight questions in the chat on 2026-11-09 (§ 2, calls 1 to
8). Calls 9 to 21 are open and "go" takes every default. Nothing is started; nothing on the Deck has been touched (the
session only read its state).

**Who runs it:** one Fable chat **at high** (a fresh one told "Run plan 103", recommended; or the planning chat
switched down from max, § 4) runs the session, reads every change and lands it. The briefs are already written. **Sonnet 5.5 high** helpers write the notes and build everything that needs a judgment;
**Sonnet 5.5 medium** helpers write the test questions, run the long measurements, do the mechanical fixes, drive the
Deck and keep the books; **Opus 5.5 extra-high** takes the three D-pad and layout jobs, each with a Deck measurement in
hand first; **Fable at max** is the second opinion, asked at most six times (§ 7). Up to fifteen helpers at once,
refilled as slots free. The whole setup is one table in § 4.

**Read first:** [AGENTS.md](../../AGENTS.md); [docs/lessons-learned.md](../lessons-learned.md) §§ 1 to 4;
[docs/agents/bug-wave-runbook.md](../agents/bug-wave-runbook.md); [docs/roadmap-kb.md](../roadmap-kb.md) and
[its long notes](../roadmap-kb-details.md); [plan 102](102-kb-wave-five.md) §§ 5, 6, 12 and 13 (the last wave; its
briefs and runbooks are the shape copied here).

**Files for this plan (written 2026-11-09):** the helper rules [assets/103-helper-rules.md](assets/103-helper-rules.md),
the briefs [assets/103-lane-briefs.md](assets/103-lane-briefs.md) (one per helper), the first Deck runbook
[assets/103-runbook-block-D0.md](assets/103-runbook-block-D0.md); the session writes one runbook per later block.
Evidence files: `plan103-<ROW>.json` in the workshop's `test-evidence` folder. Handovers:
`workshop:planning/assets/103-handover-<block>.md`.

---

## 1. One sentence

Close the three half-done knowledge-base entries for good (Phase 5's notes, the screenshot measurement, the visual
maps), by giving the 23 games that still lack them enemy and item notes with test questions written by someone else,
measuring picture reading on real play pictures and letting a picture's own content find the notes, and testing whether
the Deck's AI can mark a boss picture before anything is drawn; build the honest "I don't know" and the crowding fix;
add the first versus notes and mod basics; fix every open bug a helper can act on, each in a lane sized to it; and check
the work on the Deck in rolling blocks as it lands, with the knowledge-base roadmap audited before go, current at every
step, and audited again at the end.

## 2. The maintainer's calls

**Answered in the chat on 2026-11-09 (they become decision D140; D139 was the last, D138 is reserved by plan 101):**

1. **Notes scope: all 23 games.** Every game that still lacks enemy and item notes in the short labelled shape gets ten
   to fifteen (about 280 notes), one helper per game, in three batches (§ 5f).
2. **The four bigger pieces: all in.** A picture finds its notes (with a bigger labelled picture set); the marked
   screenshot, test first; Left 4 Dead 2 versus notes (plan 17's first three steps, Counter-Strike 2 out); mod basics
   tips (plan 101's knowledge-cards lane, no scan of the device).
3. **Bugs: every open bug on both roadmaps a helper can act on.** The six knowledge-base bugs and nine from the main
   roadmap. The README refilm stays the maintainer's; the tab-sections bug gets a measurement only.
4. **Reads: a sample of ten.** A separate checker re-reads every note sentence against its source page and the licence
   reviewer reads every file; the maintainer reads ten random notes per batch on the checks page, and the rest closes
   on that. This also covers the notes still waiting from plans 100 and 102 (one sample of ten for those 125).
5. **The four old calls: all four recommended answers.** Keep "This screenshot is from <game>." at the start of a
   picture question; build the crowding fix (it lands only if no test question loses its right note); close the card
   style pass as not worth doing; re-run the story-cover check with more tries once the answer test's repeated-answer
   fault is fixed.
6. **What the rig may do on the Deck without asking again: all four.** Copy the Steam screenshots already on the Deck
   to the private workshop (nothing on the Deck changes); place test pictures in the Deck's screenshot folder and
   remove them at the end; delete saved chats the test drivers made, never the maintainer's; pull one better picture
   model (about 3 GB) to measure it there, removed at the end.
7. **Phase 5's other half (a smarter order for the suggestion chips): it moves to its own roadmap entry so Phase 5 can
   close, and one helper builds it late in the session if a slot is free.**
8. **Run length: until the list is done or the week reaches 90 percent.** When a five-hour window fills, the session
   stops starting helpers, waits, and picks up by itself at the reset. A short report at every clean stopping point
   (§ 5, "Waves").

**Open, each with its default in brackets ("go" takes every default):**

9. **Models and efforts** as in § 4. Two notes: the routing table would put Opus at extra-high in the seat that runs the
   session (Fable is the maintainer's choice); and the bookkeeper is Sonnet medium, not Haiku, because Haiku was tried
   on bookkeeping in plan 83 and fell short. *[As listed.]*
10. **A picture question may make one short extra AI call first** ("what game, place and enemy is this?") so the note
    search has something to go on. A rule from August says no extra call. *[Build it and measure it against today. It
    lands switched on only for Strategy questions with a screenshot and the library on, and only if the right note is
    found at least twice as often on the picture set and the extra wait on this PC is under ten seconds. Otherwise it
    lands switched off. Either way you confirm or revert with the Deck's own timing in hand.]*
11. **The honest "I don't know".** *[It lands switched on only if the AI says in its own words that its notes do not
    cover the question in at least half of the tries on the unanswerable questions (today: none in its own words), and
    ordinary answers keep their facts within the test's own noise over two runs. Otherwise it lands switched off with
    the numbers, and the call is yours.]*
12. **The marked screenshot's bar.** *[Build it only if the best of the Deck's picture models averages 7 out of 10 or
    better on at least 15 boss pictures, graded by Opus. Under the bar the idea is shelved with its numbers and the bar
    that would reopen it, and the visual-maps entry closes either way.]*
13. **Where the versus notes come from.** Plan 17 locked "archive dumps only" in August; every note since September came
    from the live wiki reader, which prints each page's licence and revision. *[The live reader, same credit line.
    Counter-Strike 2 stays out.]*
14. **A whole answer behind a spoiler cover shows no notes line today** (on purpose in the code: the line waits until
    the cover is opened). *[Draw a one-line caption with neutral words and no note titles while the cover is shut, the
    wording protected notes already use; the full notes line appears when the cover is opened. A screenshot goes on the
    checks page for your eye, and it is one commit to take back.]*
15. **Which picture model comes first on the Deck.** On this PC a model the Deck already offers named the place in a
    picture 70 times in 100 against 52 for the starter model. *[No change this session. Block DP measures speed and
    memory on the Deck with a game running, and the numbers come to you as a call.]*
16. **The starter-models box fix needs a fresh install to check on the Deck.** *[Proven by its tests and a look on the PC
    stand-in; the Deck row goes on the checks page for your hand.]*
17. **Push and publish.** *[Nothing pushed, nothing published. At the end: "push" from you, and one library publish
    after your ten-note samples. The library built on 2026-11-03 was never published; this session's build replaces
    it.]*
18. **Standing rules while you are away** (plan 102's): a fix that fails on the Deck twice moves up one model tier
    without asking; a new one- or two-star bug with a known cause gets one helper round of about an hour; anything
    blocked gets the safest choice at once and is raised in the chat and in § 12; never push, publish, merge to main,
    switch branches in the shared folder, type a PIN or password, reload the plugin with a game running. *[Kept.]*
19. **Budget lines.** No new helper past 75 percent of the five-hour window or 90 percent of the week (D128). Read when
    planning ended (2026-11-09, about 19:15 EST): 28 percent of the five-hour window (it resets at 20:00 EST tonight), 9
    percent of the week (resets Wednesday 11 November at 08:00 EST), and Fable's own weekly counter at 16 percent.
    Planning alone moved those from 5, 6 and 11. *[Kept. New: the session says Fable's counter at every stopping point;
    if it passes 85 percent the session asks you whether to carry on in a new Opus chat from the pick-up list in § 12.]*
20. **Mod basics.** *[Plan 101's knowledge-cards brief as written, run here as lane G1; plan 101's other lanes and its
    decision number stay untouched.]*
21. **Hades and Red Dead Redemption 2** have only own-words notes today, with no wiki cited. *[Each lane first proves a
    usable licence with the live reader (the game's own wiki; failing that, Wikipedia, as Baldur's Gate 3 did). If
    neither works, that game gets no new notes and the report says so.]*

## 3. What a player notices after this session

Once the build reaches their Deck (and, for the notes, once the library is published); every line reads "should" until
its Deck row passes:

- **Every game in the library has enemy and item notes.** "How do I deal with X" and "what does this item do" have a
  note to stand on in all 38 games (15 today), and each game's suggestion chips get more variety.
- **The AI says so when its notes do not cover a question**, instead of answering as if it knew. Today it admits it in
  about 3 of 24 tries, and never in its own words.
- **A note found by its meaning is no longer pushed out by a note that shares one stray word** with the question.
- **A screenshot can find the right note.** Attach a picture of a boss and ask "how do I beat this": the picture's own
  content is used to pick the notes (if it measures well enough to switch on).
- **Left 4 Dead 2 versus, survival and realism questions get notes**, and a mods question gets a plain "how mods work
  on a Deck" tip.
- **D-pad and screen fixes:** Down from the Copy icon reaches a checklist's steps; the "This answer / Session" strip in
  Show details can be reached on every chat; a covered answer still says notes were used; a cover on a no-story game
  named in the question opens as it should; the starter-models box fits the Deck's screen; the quick-start box points
  at Install Ollama first.
- **If they pass their bars:** suggestion chips ordered by what you last asked, and a screenshot in the reply with up
  to three numbered marks (hit, avoid, dodge).
- **Behind the scenes:** the answer test's three tries become three real tries, test questions stop colliding in one
  file, and picture reading is measured on forty or more real play pictures instead of eleven title screens.

**How much better shape the knowledge base is in afterwards.** Counted at tip `3d86f5b7`:

| | Today | After, if everything lands and passes |
|---|---|---|
| Half-done (PARTIAL) knowledge-base entries | 3 (Phase 5, the screenshot measurement, the visual maps) | 0: each is closed, or what is left of it is its own named entry |
| Games with enemy and item notes in the labelled shape | 15 of 38 | 38 of 38 |
| Notes in the library built on this PC | 583 | about 875 |
| Deck tips | 167 | about 182 |
| Open knowledge-base bugs (not accepted) | 6 | 0 to 2 |
| Next entries never started (honest answers, versus notes, mod knowledge) | 3 | 0: honest answers built and measured; versus built for Left 4 Dead 2; mod basics built (the device side stays plan 101's) |
| Calls waiting on you | 6 | 2 reads (the monthly ten replies; plan 100's wording), your ten-note samples, and up to four "confirm or revert" calls that arrive with numbers |
| Search test questions | 936 | about 1,500 |
| Labelled test pictures | 11, none with a boss | 40 to 60, with play scenes and bosses |
| Knowledge-base Deck checks owed | 4 rows | 0 to 2 |
| Open bugs on the main roadmap | 11 | 2 to 4 (the refilm; the tab sections, measured; whatever resists) |

What stays for later, on purpose: the catalog phase (Phase 8, months of work), Counter-Strike 2, and the device side of
mod knowledge. With Phases 4, 5 and 7 closed, the catalog is the next knowledge-base step and nothing older stands in
front of it.

## 4. Before go, and the exact setup

**The maintainer, about ten minutes:**

1. **Choose where it runs, then say "go"** (or send corrections to § 2 first). Recommended: a fresh Fable chat at high
   that is told "Run plan 103"; these four files hold everything it needs. The planning chat is at max effort and
   already carries a long history, which every one of its turns would pay for again out of Fable's own weekly counter.
   The other way: switch the planning chat from max to high in the app's model picker (a chat cannot change its own
   effort) and say "go" there.
2. **The Deck:** on, on its charger, on its own screen, on the home network, nothing running. It is all of those right
   now. Leave it to the rig while the session runs; if you need it, say so and the session hands it over at the next
   block boundary.
3. **Close any other window that has the Deck tools loaded.** One is holding the tools' debug port right now (§ 6).
   Only one chat may drive the Deck.
4. **This PC** stays on. Ollama is running with every model the measurements need (checked 2026-11-09).
5. Phone notifications on, if you want to hear when something is truly blocked.

**The exact setup:**

| Seat | Runs as | Model and effort | Notes |
|---|---|---|---|
| Runs the session: briefs, reading every change, landing, the Deck's failures | this chat | Fable, high | writes no code and no roadmap rows itself |
| Note lanes, feature lanes, fixes that need a judgment | `kb-lane`, `feature-lane`, `bugfix-lane` | Sonnet 5.5, high | each in its own copy of the repo; one change per commit |
| Test questions, measurements, mechanical fixes | `kb-lane` or `bugfix-lane-sonnet-medium` | Sonnet 5.5, medium | a measurement lane commits nothing |
| The three D-pad and layout lanes (F1, F2, and P4 if it is built) | `bugfix-lane-opus-xhigh` | Opus 5.5, extra-high | only after a Deck measurement; the second opinion reads the change before it lands |
| The bookkeeper | a general helper given `.claude/agents/bookkeeper.md` as its instructions (the bookkeeper type does not load in this chat) | Sonnet 5.5, medium | works in its own copy, landed like a lane; every status it changes names its evidence file |
| The Deck driver | `deck-driver` | Sonnet 5.5, medium | one at a time, a fresh one per block with the last handover |
| The checker, the licence reviewer, the security reviewer | a general helper, `foss-advocate`, `security-auditor` | Sonnet 5.5, high | their files say "inherit", which would be Fable, so the model is passed by hand |
| The grader of the picture marks | a general helper | Opus 5.5, high | reads the marked pictures and scores each out of ten |
| The second opinion | `advisor` | Fable, max | read-only; at most six consults, each logged in § 7 |
| Read-only lookups | a general helper | Sonnet 5.5, medium | whoever asked confirms with a search |

Every helper is started with its effort passed by hand (the last session's helpers reported the launcher's default, not
their file's). At most fifteen helpers at once, the Deck driver and the second opinion counted in, started two to three
minutes apart; a helper runs only its own tests at two workers; the full checks run once per landing, in the shared
checkout. **A ready helper starts at once; holding one back is the maintainer's choice alone.**

**The session's first acts, in this order:**

0. Commit this plan and its three asset files, staged by name: every helper reads them from its own copy.
1. `git status` (other chats' files are theirs), the tip hash, the tail of the decisions file (D140 free),
   `deck_status`, the three usage counters said in the chat.
2. The baseline: `python scripts/verify.py --full` on the tip, once, in the shared checkout, in the background.
3. Build the library once (`python scripts/kb/build_rag_db.py --seed --out build/knowledge-base`) and copy it into every
   copy that measures.
4. Copy the Deck's Steam screenshots into the workshop (`screenshots/plan103-steam/<app id>/`), reading only.
5. Cut wave A's copies (`python scripts/worktree.py create p103-<lane> --base experimental`), confirm each sits at the
   tip, and start the helpers: the bookkeeper's audit (K0) first, the rest two to three minutes apart, each with the
   rules file, its brief, the tip hash and its copy's path.
6. Deck block D0a with a fresh driver at the same time (§ 6). The Deck never waits for the helpers.
7. Second-opinion consult 1 (§ 7) while wave A builds; its corrections go to the running helpers as messages.

## 5. The work: what can run in parallel, and what cannot

**The rule for parallel lanes is files, not features.** Two lanes never own the same file at the same time. Everything
not named as a wait runs at once. The full briefs are in [assets/103-lane-briefs.md](assets/103-lane-briefs.md); this
section is the map.

### The lanes

**Groundwork (wave A):**

| Lane | What | Stars, tag | Model | Owns (area) | Waits for |
|---|---|---|---|---|---|
| K0 | The bookkeeper's audit before anything lands: make room in the roadmap files, write D140, correct what planning found, one open testing row per check (§ 5k) | ★ docs | Sonnet medium | the roadmap files, the testing rows, the decisions file | nothing; lands first, and every landing waits for it |
| T1 | Test questions can live in many files, so question writers never share one; the search test's saved library also notices new notes | ★★ `[KB]` `[QA]` | Sonnet high | the search test's loader and every reader of the question file (three scripts, six test files) | nothing |
| T2 | The answer test's three tries really are three (a seed per try; find why they repeat), and it counts "said so in its own words" apart from the back end's footer line | ★★ `[KB]` `[QA]` | Sonnet high | the answer test's script, tests and fixture | nothing |
| T3 | The library's build and publish checks accept free-to-use (CC0) sources | ★ `[KB]` | Sonnet medium | the publish, build and wiki-extract scripts, their tests | nothing |
| T4 | One-call Deck checks: a script that reads back the notes line, the covers, the footer line, the focus and the log's attach line; and one that places and removes test pictures | ★★ `[QA]` | Sonnet high | new scripts only | nothing; block D0a tries them |
| X0 | The numbers before anything changes (search, tips, answers, honesty, the story-cover check with more tries, pictures) | ★★ `[KB]` | Sonnet medium | nothing in the repo | the library build; its answer half waits for T2 |

**Answers and search:**

| Lane | What | Stars, tag | Model | Owns (area) | Waits for |
|---|---|---|---|---|---|
| R1 | The crowding fix: a note the word search missed keeps a fixed, fair credit however long the word list is | ★★ `[KB]`, the search path (lands alone) | Sonnet high; the second opinion reads the numbers | one function and its constants in the search service, its tests | X0's baseline |
| R2 | The prompt lane: the honest "I don't know" (§ 5b), the finale rule for versus notes, the "Looks like" label | ★★★ `[KB]` | Sonnet high; the second opinion reads the wording and the numbers | the prompt file, the prompt builder in `main.py`, the ask service, the request file, the spoiler rules page, tests | T2 landed before it measures |
| C1 | Suggestion chips ordered by your last question (call 7) | ★★★ `[KB]` | Sonnet high | the chips file, its tests | V1 landed; a free slot |

**Pictures:**

| Lane | What | Stars, tag | Model | Owns (area) | Waits for |
|---|---|---|---|---|---|
| P1 | A labelled picture set of 40 to 60 real screenshots, with play scenes and bosses | ★★ `[KB]` `[QA]` | Sonnet high | a new labels file; the pictures stay in the workshop | the screenshot copy (first acts, step 4) |
| P2 | The picture's own guess joins the note search (§ 5c) | ★★★★ entry, this part ★★★ | Sonnet high | a new module, the picture scoring script; then one call site in the request file | P1's set; its wiring waits for R2 to land |
| P3 | The marks test: can the Deck's AI mark hit, avoid and dodge spots on a boss picture | ★★★ `[KB]` | Sonnet high builds, Opus high grades | a new script and its tests | P1's boss pictures |
| P4 | The marked screenshot in the reply, only if the bar in call 12 is met | ★★★ `[KB]` ui | Opus extra-high; the security reviewer and the second opinion read it | a new picture method, the drawing, the transcript file | P3's result; F1 landed |

**Versus and mods:**

| Lane | What | Stars, tag | Model | Owns (area) | Waits for |
|---|---|---|---|---|---|
| V1 | Groundwork for versus notes: five new note kinds, counted as low spoiler risk, with their own chip wording | ★★ `[KB]` | Sonnet high | the spoiler risk lists, the chips file, the search's kind words, the architecture doc, plan 17's table | nothing |
| V2 | Left 4 Dead 2 versus notes (callouts, survival, realism, team play), and the seven "Playing as" notes filed under the new kind | ★★★ `[KB]` | Sonnet high | one new notes file; seven kind fields in the seed | V1 landed |
| G1 | Mod basics: about fifteen tips and the words that route a question to them | ★★★ entry, first step | Sonnet high; the licence reviewer reads them | the tips file, the tips router, their tests | nothing |

**Screen and D-pad:**

| Lane | What | Stars, tag | Model | Owns (area) | Waits for |
|---|---|---|---|---|---|
| S1 | Covers: a no-story game named in the question opens its cover; a covered answer shows a notes caption; a cover opened on one answer no longer shows the notes under every answer (found while planning) | ★, ★, ★★ `[KB]` `[ui]` | Sonnet high | the notes line builder, the no-story lists in both languages, the cover rule, the copy text, three call sites in the transcript file | block D0b's two readings for the caption; lands before F1 is cut |
| F1 | The answer screen's D-pad: Copy icon and checklist; the Show details strip and the chip ladder get their own Steam stops (also the main roadmap's "strip cannot be reached" bug) | ★★, ★★, ★★ `[focus]` | Opus extra-high; the second opinion reads it | the corner slots, the answer screen's focus files, the details panel, the chip ladder, the transcript file | S1 landed; block D0b's measurements |
| F2 | The starter-models box fits the Deck's screen | ★★ `[ui]` `[first-run]` | Opus extra-high | the two-button box, the starter set's text, the download notice | nothing (its evidence has pictures) |
| B1 | Two small ones: the mic-off log noise; the quick-start box leads with Install Ollama | ★, ★ | Sonnet medium | the voice files; the quick-start text | nothing |
| B2 | The chat summing-up that gave up after 68 seconds | ★ `[chat]` | Sonnet high | the chat summary files | block D0b's log reading |
| — | Two document mismatches (the bookkeeper); the rig's two bugs re-checked on the Deck (block D0a); the tab sections measured (block D0b) | ★ each; ★★★ measured only | | | |

**Notes for 23 games (§ 5f):**

| Lane | What | Stars, tag | Model | Owns (area) | Waits for |
|---|---|---|---|---|---|
| N13 to N35 | Enemy and item notes, one game per lane | ★★★★ `[KB]` | Sonnet high, 23 lanes | one new notes file each, with its sources list | nothing to write; lands in batches after the checker and the licence reviewer |
| Q3, Q4, Q5 | Blind test questions for the new notes, from names only, one helper per batch | ★★ `[KB]` | Sonnet medium | one new question file per game | T1 landed; the names from the note lanes |
| Q6 | Labels for the eight versus questions that find nothing today; questions for the mod tips | ★★ `[KB]` | Sonnet medium | eight rows of the main question file; one new file | V2 and G1 landed |
| CH1 to CH3 | The checker: every note sentence against its source page; picks the ten-note sample | ★★ `[KB]` | Sonnet high | nothing (reads and reports) | each note lane's report |
| M | Corrections to older notes that the note lanes turn up | ★ `[KB]` | Sonnet medium | the seed file, one helper at a time | V2's seed commit landed |
| X1, X2 | The numbers after wave B, and on the final library | ★★ `[KB]` | Sonnet medium | nothing in the repo | the landings |

### Waves, and the clean stopping points

- **Wave A, at go (fifteen at once):** K0, T1, T2, T3, T4, X0, R1, R2, V1, G1, S1, B1, B2, the Deck driver for block
  D0a, and the second opinion's consult 1. **Stopping point A:** the groundwork, the bugs that are not D-pad work, the
  crowding fix and the honest answer are landed or measured; the Deck's owed rows have run.
- **Wave B, as slots free:** F2, P1, the six original titles' notes (N13 to N18: Left 4 Dead 2, Fallout 4, Red Dead
  Redemption 2, Hades, Half-Life 2, Cyberpunk 2077), V2, P3, P2, F1 (once S1 has landed and block D0b has measured),
  Q3, CH1, X1; deploy 1 and block D1. **Stopping point B:** Phase 5 is finished as it was written (the thirteen
  original titles), the pictures are measured, the D-pad fixes are on the Deck.
- **Wave C:** the ten thinnest games (N19 to N28: the five Mario Party games, both Super Smash Bros. games, Grand
  Theft Auto III, Yoshi's Story, Diddy Kong Racing), Q4, CH2, Q6, M; deploy 2 and block D2. **Stopping point C.**
- **Wave D:** the last seven (N29 to N35: Fallout: New Vegas, Brotato, Palworld, Skyrim, Hollow Knight, Black Mesa,
  DOOM Eternal), Q5, CH3, C1, P4 if its bar is met, X2, the final library, deploy 3, blocks D3 and DR, the end audit,
  the report. **Stopping point D: done.**

Each stopping point gets five lines in the chat and in § 12: what landed, what the Deck showed, the three usage
counters, what is next, anything waiting on the maintainer.

### Where lanes would collide, and how the order avoids it

- **The prompt file** has one owner all session: R2. V1 hands it the finale rule; the note lanes' "Looks like" label is
  R2's first small commit. P2's own question to the picture model lives in P2's new module.
- **The request file, the ask service and `main.py`:** R2 first; then S1's follow-up, if the screen needs the back end
  to say which game it resolved; then P2's one call site; then P4's new method. Each is cut after the one before has
  landed.
- **The search service:** R1 only, and it lands alone with the fixture check in its landing log.
- **The transcript file** (five of the screen fixes touch it): S1 first, F1 cut after S1 lands, P4 after F1.
- **The chips file:** V1 first, C1 after.
- **The answer test:** T2 is the only lane that edits it; everyone else runs it. **The search test's main question
  file:** after T1 lands only Q6 edits it (eight rows); every other question lane owns its own new file.
- **The seed file:** V2's seven kind fields first, then lane M, one helper at a time. **Every note lane owns one new
  file**, in its own number range (2200 to 4499 by hundreds; the versus file 4500 to 4599).
- **The roadmap, testing and changelog files:** the bookkeeper only.
- **This PC's AI model is one process.** The measuring lanes (X0, R1, R2, P2, P3, T2) run one measurement at a time
  and queue; the session staggers them. The note lanes do not need it except for one test build each.

### Work bumped above Sonnet, and why

F1 and F2 are D-pad and layout work: the routing table gives those to Opus extra-high once a Deck measurement is in
hand, and the record says they fail at every tier without one. F1's Copy-icon half has its evidence from 2026-11-03
(seen three times); its Show-details half waits for block D0b. F2's evidence has two pictures. P4, if it is built, puts
a picture into the reply for the first time (answers draw no pictures today, on purpose, since the 0.6.0 security
review), so Opus builds it and the security reviewer reads it. The marks are graded by Opus because the mock-up board's
own note says so. R1 changes what every question goes through, so the second opinion reads its numbers before it lands,
though the change itself is one function.

### 5a. The crowding fix (R1)

**Read in the code 2026-11-09:** the search blends a word list and a meaning list. A note the word search missed is
given a place one past the end of the word list, so as a game gains notes and the word list grows from three to ten,
that note's credit shrinks, and a note that shares one stray word with the question ends up level with it. Nothing caps
the word list before the blend. The lane builds the two smallest fixes in the one function that does the blend (cap the
word list; or give a missed note a fixed place) and measures both. **It lands only if:** no held-back test question
loses its right note; the thirty meaning-only questions do better than today's 23 of 30; the questions plan 102 found
crowded out get their note back; an exact word match still comes first; the "No close match" line shows on no question
it did not show on before. **Deck check (P103-CROWDING-01):** two of the crowded-out questions, by name, attach their
right note.

### 5b. The honest "I don't know" (R2)

**Read in the code:** the back end already knows, before the AI writes a word, whether it will add the "Not in my
notes" or "No close match" line under the answer. The AI is never told. So a question about something the notes do not
have reads to the AI as "ground your answer in these notes", and it does. The lane passes that one fact through to the
instructions and adds one sentence only on those turns (ordinary turns stay byte for byte the same, proven against the
saved fingerprints). Three wordings are measured on the eight unanswerable questions and on the ordinary set, with T2's
new "in its own words" count. The landing rule is call 11. **Deck check (P103-HONEST-01):** a made-up boss in Hollow
Knight: the reply's first sentence says the notes do not cover it; a real boss question reads as before; two wordings
each.

### 5c. Pictures: the set, the search, the marks (P1, P2, P3, P4)

**The set (P1).** Today's set is 11 pictures, mostly title screens, none with a boss, so no number about bosses means
anything. Steam files screenshots by game, so the copy from the Deck (call 6) arrives already labelled with its game.
The lane picks 40 to 60 across ten or more games, shrinks each the way the plugin does before the AI sees it, and
labels the scene, the place and any boss or enemy. It skips anything that is not a game picture. The ten labels it is
least sure of go on the checks page.

**The search (P2).** Today the note search runs before the AI sees the picture and uses only the typed words, so "how
do I beat this" with a boss on screen searches for "how do I beat this". The lane builds a short first question to the
picture model (game, place, enemy; "not sure" allowed) whose answer joins the search words, the way a follow-up's
earlier subject already does. Measured against today on P1's pictures that have a note: how often the right note is
among those attached, and the seconds added. The rule is call 10.

**The marks (P3, then P4).** The script asks each of the Deck's picture models for up to three marks on each boss
picture (what kind, where, three words, sure or not), draws them on a copy the way the mock-up board draws them, and an
Opus helper grades each out of ten: is the mark on the thing it names, is the advice right for that boss, and a
confident wrong mark costs more than an honest "not sure". The bar is call 12. Only then is P4 written.

**Deck:** block DP measures the two best picture models on the Deck itself, with and without a game; rows
P103-PICTURE-SEARCH-01 and P103-MARKED-01 if those land.

### 5d. Versus notes and mod basics (V1, V2, G1)

Plan 17 was written in August and none of it is built. Its file paths are stale, and the seven "Playing as the Tank,
Hunter, ..." notes it planned already exist, filed as game mechanics. V1 adds the five kinds (versus, co-op, callout,
survival, realism), counts them as low spoiler risk and gives them their own chip wording. V2 files the seven notes
under the new kind and writes ten to fifteen new ones from the Left 4 Dead wiki; eight versus test questions find
nothing today, and their subjects (not their wording) are V2's list. The finale stays out of every note (plan 17's
rule), and R2 adds the sentence that keeps the AI from volunteering it. G1 is plan 101's knowledge-cards brief: about
fifteen own-words tips, each marked "Researched, unconfirmed", on what the mod managers and script extenders are, where
each keeps its files, backing up first, and mods with online play. **Deck checks:** P103-VERSUS-01 and
P103-MODS-TIPS-01.

### 5e. The screen and D-pad fixes (S1, F1, F2, B1, B2)

- **A no-story game named in the question (S1).** The rule that opens a cover by itself looks only at the game that is
  running. With nothing running it has no game. And Brotato is on the list by its Steam number only, so even a typed
  name could not match, on the screen or in the back end.
- **A covered answer's notes (S1).** The notes line waits for the cover to be opened, on purpose. Call 14 draws a
  caption meanwhile.
- **One open cover shows every answer's notes (S1, found while planning).** A single page-wide switch says "a cover is
  open". Opening a cover on one answer lifts the wait on all of them, which could show a protected note's name under
  an answer that is still covered. Not seen on the Deck; the lane writes the failing test first.
- **Copy icon and checklist (F1).** Down from the Copy icon tries five stops and none of them is the checklist. Up from
  step 1 is left to Steam, which picks the nearest thing, the Copy icon.
- **The Show details strip (F1).** The "This answer / Session" row and the chip ladder under it are known to the plugin
  but have no stop of their own in Steam's eyes; when the panel's page has lost the window's focus the hop to them
  fails and the ring falls through to the suggestion chips. The notes line got its own stop in plan 97 and is the
  model.
- **The starter-models box (F2).** The shared two-button box has no height limit and cannot scroll, so on a fresh
  install its title and the line saying where Ollama downloads from sit above the screen.
- **Small ones (B1, B2).** Two places on the screen ask the back end to stop a recording that never started; the
  quick-start box's first paragraph is about a home PC; the summing-up's 68 seconds was not its time limit (that is
  120), so its log decides what B2 does.

Their Deck rows are in § 6.

### 5f. Notes for the 23 games (N13 to N35, Q3 to Q5, CH1 to CH3)

Plan 102's shape, three times the size. Each lane takes one game and writes ten to fifteen enemy and item notes in the
labelled short-line shape, one new file plus a list of the page and revision behind every line. **Every sentence comes
from a page the live reader fetched, with its licence printed; nothing from memory.** A lane adds subjects the game's
notes do not cover yet (the briefs list what each game already has). New this wave: a note about an enemy or a boss
gets one "Looks like" line when its page describes the look, which is what a picture's guess can match. A note's name
and first line never give away a twist, an ending or a hidden boss.

Whoever writes a note never writes its test question: the question helpers get names only. The checker (a different
helper) reads every sentence against its page and the licence reviewer reads every file; a notes file lands only after
both. Files land in batches of up to six. The checker picks ten notes at random from each batch for the maintainer's
read (call 4).

**The batches:** B, the six original titles (the batch that finishes Phase 5 as it was written); C, the ten thinnest;
D, the seven that have prose notes only. **Deck check (P103-NOTES-23-01, block D3):** with the session's library
installed, one question per game by name attaches a note from the new file; passes on 20 of 23 or more and names the
misses.

**When each half-done entry counts as finished:**

- **Phase 5** leaves PARTIAL when the 23 files and their questions are in, the crowding fix has landed or been turned
  down on its numbers, and the Deck row has passed. The ten-note samples stay as one line under "Calls waiting on
  you": a read is a call, not a phase. The chip order is its own entry (call 7).
- **The screenshot measurement** is done when the set has 40 or more pictures with at least ten bosses or enemies,
  every picture model the Deck offers has been measured on it, the two best have been timed on the Deck, and the
  picture's-guess search has been measured. What is left (which model comes first; whether the extra call is on) are
  calls with numbers.
- **The visual maps** entry is done when the marks test has run: the marked screenshot is then either built and
  checked on the Deck, or shelved with its numbers.

### 5k. The bookkeeper: before, during and after

**Before (K0, the first thing to land).** The knowledge-base roadmap is 0.2 KB under its size limit and the testing
file 3.4 KB under its own, so the first job is to make room: older dated text moves, word for word, to the long-notes
file and the testing archive. Then: D140 written into the decisions file from § 2; the four answered calls taken off
the waiting list (the card style pass closes with its numbers); the notes entries reworded to the sample rule; the
corrections planning found (§ 8); the chip order as its own entry; one open testing row per check in § 6.

**During.** After every landing chain and every Deck block the bookkeeper gets the session's result list and moves the
entries, one commit, in its own copy, landed like a lane. A landed fix moves to "Deck check owed" naming its row; a
Deck pass moves to Done naming its evidence file; a fail goes back with what was seen. The session spot-checks every
sweep against the evidence files. **The roadmap is current at every stopping point**, so a look from a phone shows
where each entry stands.

**After (K9).** The same audit as K0 once the last landing and the last Deck block are in: every entry moved this
session names its row and its evidence; every number in "Where things stand" is counted from the data, not carried
over; the three half-done entries read as § 5f says; every roadmap file is under its limit.

## 6. The Deck: rolling blocks, and the state of the Deck tools

**The Deck tools project** (Decky Plugin Studio, the controller rig's software, its own repo): version 0.3.12, released
2026-11-05, on its main branch with nothing uncommitted and nothing unpushed; 49 tools, 850 tests, one of which fails
now and then for a reason nobody has named. Read from this chat on 2026-11-09: the Deck answers, the PC's AI answers,
the controller board is on COM7 running the newest program, the stop switch is armed, and nobody holds the Deck. One of
its nine self-checks fails: another copy of the tools is running on this PC and holds the debug port (§ 4, step 3).

**What is new since plan 102's Deck blocks, and what it buys:** a question can be typed straight into the plugin's box
(no pinned chips, no script, no walk to Ask); a game can be launched by its title, non-Steam shortcuts included (the
hidden-box row was blocked seven times for want of that); a real sleep and wake on demand (it clears the suspend
overlay that blocked three rows last time); every tool call is logged with the row it belongs to; a replay can no
longer run all hundred saved walks by accident.

**What this plan does about speed and quality:**

- **One check, four calls instead of twenty.** Last time a single "ask, see which notes attached, count the covers,
  save the evidence" took fifteen to twenty-five tool calls. Lane T4 writes a read-back script, and the runbooks switch
  to: type and send in one call, wait for the answer to finish, read back once. Block D0a tries the new way first and
  times it against the old; the old way stays as the fallback.
- **Checks as the work lands**, not one pass at the end: up to four deploys, each followed by a block.
- **A fresh driver per block**, small page reads instead of whole walk outputs, the keep-awake hold released before any
  long idle gap, and a sleep and wake before the first game launch of a block.
- **Pictures without a hand:** test pictures are placed in the Deck's screenshot folder (call 6), because the rig's own
  screenshot press saved nothing twice.
- **Still a limit:** the rig cannot play. Real play scenes come from the maintainer's own screenshots; a check that
  needs a boss on screen in a running game stays a hand check.
- **Asks for the Deck tools project** (a change there cannot load into a running chat, so these are written into the
  findings log in `docs/mcp-setup.md` by the bookkeeper and drafted as upstream issues for the maintainer to send): a
  wait that knows when an answer has finished; noticing and clearing the stuck suspend overlay; a screenshot tool that
  saves where the plugin looks; a replay that compares the Deck's build, not the PC's; time limits on the deploy's copy
  steps; the library walk that stops at the fifth row.

**The blocks.** One driver per block, a fresh one each time. Every block starts by reading `deck_status`, takes the
keep-awake hold, reads which screen is live, backs up the settings, reads the build, and uses one test chat. Every Deck
command is exactly `ssh deck@192.168.86.52 '<command>'`. One evidence file per check, never overwritten, a screenshot
beside every look the maintainer judges. **Unload the Deck's AI before launching a game; never reload the plugin with a
game running.** A question is worded once and never repeated word for word.

| Block | When | What |
|---|---|---|
| D0a | Minute zero, the build already on the Deck, no deploy | Setup; clear the test chats earlier drivers made and start one clean test chat (P103-D0-CHATS); the new one-call way tried and timed against the old (P103-D0-FLOW); the smoke pass; **the rig's two roadmap bugs** (three plugin reloads with nothing running, the plugin opened at once after each: P89-RIG-OPEN-AFTER-RELOAD); **the owed rows:** the hidden box on a game known only by name, with Doom 64 launched by its title (STRAT-SPOIL-NAME-01); Undo, then Down, with the page out of focus (P102-UNDO-FOCUS-01; its "before the fix" reading can no longer be taken, the fix has been on the Deck since 2026-11-03); the picture names the running game, with a placed test picture (P102-PICTURE-01) |
| D0b | Right after D0a, a fresh driver | **Measurements the lanes wait for:** a fully covered answer: does the notes line appear once the cover is opened; a Brotato question by name: the cover's state and what the log says the back end decided; Up from a checklist's step 1 and Down from the Copy icon, with choice buttons on screen; the Show details strip on a four-turn and an eight-turn chat, three tries each, with and without a game, reading the page's focus and the strip's own attributes; one question in a long chat for the summing-up's log line; the Settings tab with three sections open, a twenty-press walk (the tab-sections bug) |
| DP | After P1's set exists | Pull the second picture model; six placed pictures on each of the two models, with and without a game: seconds to the first word, seconds to done, free memory, game and place named |
| D1 | After wave A's landings and deploy 1 | One check per landed item: P103-CROWDING-01, P103-HONEST-01, P103-BROTATO-01, P103-COVERED-NOTES-01, P103-COVER-PER-TURN-01, P103-MIC-LOG-01, P103-QUICKSTART-01, P103-SUMUP-01 if it was fixed, P103-MODS-TIPS-01, P103-VERSUS-01 once V2 is in; the look check on each tab touched; the free-play sweep with and without a game |
| D2 | After F1 and F2 land and deploy 2 | P103-CHECKLIST-COPY-01; P103-DETAILS-STRIP-01; P102-UNDO-FOCUS-01 again (its fourth Down must land on the details strip); P103-PICTURE-SEARCH-01 if P2 is wired; the starter box on the PC stand-in; the look check; the sweep |
| D3 | The final library and deploy 3 | P103-NOTES-23-01 (one question per game); P103-CHIP-ORDER-01 and P103-MARKED-01 if built; every saved knowledge-base walk re-saved on the final build |
| DR | The end | The smoke pass again; **put everything back:** the published library (Remove, then Download; the version read back), every setting key by key, the pulled picture model removed, the placed pictures removed, pinned test chips cleared, the game closed, the keep-awake hold released |

**A check only the maintainer can do** goes on the checks page in a "plan 103" group, with its pictures beside it,
never left in the chat: the ten-note samples; ten picture labels; the quick-start box's new words; the covered answer's
caption by eye; the starter box on a fresh install; any row that needed a boss in play.

## 7. The second opinion (Fable at max)

The `advisor` helper, read-only: one bounded question with the exact files and evidence, one recommendation back. At
most six.

| # | When | The question |
|---|---|---|
| 1 | As wave A starts | The briefs against the code: does any brief name a cause the code does not have, a file another lane owns, or a Deck pass its tests cannot stand for? |
| 2 | Before R1 lands | Cap the word list, or a fixed place for a missed note: which, given both tables of numbers, and does it keep the three rules the 2026-09-06 decision set on purpose? |
| 3 | Before R2 lands switched on | The sentence and the numbers: does it make the AI honest without making it timid on questions the notes do cover? |
| 4 | Before F1 lands | The change against the focus rules and the Deck rows: any plain hop across containers; does a test fail without the change at the level the Deck looks at; can any walk loop? |
| 5 | When anything has failed on the Deck twice | What the two failures say, and what to try third. |
| 6 | Before the report | What to tell the maintainer first, what to leave open, which items must not be called done. |

Log, one row per consult: time, the question in one line, the answer in one line, what it changed, the cost.

| Time | Question | Answer | What changed | Cost |
|---|---|---|---|---|
| 2026-11-09, 19:38 to 19:57 EST | The wave A briefs against the code | Nine corrections, stop nobody | The covers helper tested its third piece through the screen itself and found it was not a bug; the starter-box helper proved the fit at the largest text size and made Down scroll; the crowding helper measured three more tables through the plugin's own search before a setting was picked; lane F1's brief gains three files, the full Down order from the Copy icon, and "notes line first, then the strip". Five of the nine the helpers had already caught themselves | about 285,000 helper tokens |
| 2026-11-09, 20:16 to 20:23 EST | The crowding fix: a fixed place of 4, of 5, or neither | Land 5 as a partial fix; 4 is the maintainer's call | 5 lands (no measured harm; 8 more held-back questions find their note, none lose it; one of the two Deck-style questions comes back). 4 would bring both back but lets one exact word match slip from first and shows "No close match" beside a right note three times; that trade goes on the checks page with the numbers | about 64,000 helper tokens |
| 2026-11-10, 01:16 to 01:27 and 01:43 to 01:50 EST | Lane F1's D-pad change before it lands, then one follow-up on a guard F1 added to the shared row helper | Land after two small additions, both for a page that has lost focus (pass over the summed-up note; make a chip-to-chip step carry the ring). Follow-up: land the guard as it is, in both focus states | F1 made both additions, each with a test that fails without it, and tightened its stand-in page; the line in F1's brief saying a covered notes line must be a stop was the session's mistake and was dropped; block D2 gains reads the second opinion named (first entry against re-entry into the chips, the scroll before and after, a two-row grid, the Session tab). F1 landed alone at 02:19, every check green | about 232,000 helper tokens |

## 8. Things to bring to the maintainer's attention

- **This chat is at max effort; you asked for high.** A chat cannot change its own setting. And the routing table would
  put Opus extra-high in this seat; Fable is your choice.
- **Fable has its own weekly counter, at 16 percent after planning (11 before).** It is the counter most likely to stop
  the session early, because the one running the session and the second opinion both draw on it. It is said at every
  stopping point (call 19). It is also the reason to run the session in a fresh chat rather than the planning chat.
- **The roadmap files are nearly full.** The knowledge-base roadmap has 0.2 KB of room under its limit, the testing
  file 3.4 KB. The bookkeeper's first job is to move older text out, word for word. Every landing waits for that.
- **The library built on 2026-11-03 (583 notes) was never published.** GitHub's copy is still the one from 25 October.
  This session's build replaces it; one publish at the end covers both, after your samples.
- **Another copy of the Deck tools is running on this PC** and holds the debug port. Close that window before go.
- **You are on Remote Control.** If the rig's tools drop out of this chat, this chat cannot start a separate Deck chat
  from here. Every runbook carries what a fresh chat needs, so "Run plan 103 Deck block D1" in a new chat works.
- **Found while planning, for the roadmap (K0 files them):** opening a cover on one answer can show the notes under
  every answer; Brotato is missing from the no-story name lists in both languages; the picture set has 11 pictures,
  not 12, and none shows a boss; the August versus plan's file paths are all stale; the docs say an "answer cache"
  serves a repeated question back, and the lookup found none in the back end (lane T2 settles which is true); a pinned
  model is never checked for whether it can read pictures.
- **What the lookups corrected:** nothing in the code caps the word search "at ten"; the real weakness is how a missed
  note is credited. The notes line under a covered answer is hidden on purpose, so that entry is a design call, not a
  fault. The Fallout 4 half of that entry looks like a different case from another check; K0 confirms it against the
  evidence files before rewording. The seven versus role notes plan 17 wanted already exist under another kind.
- **A picture in a reply is new ground.** Answers draw no pictures today, on purpose, since the 0.6.0 security review.
  If the marked screenshot is built, the security reviewer reads it before it lands.
- **Three rules from older plans bend here, each a call above:** an extra AI call on picture questions (call 10),
  versus notes from the live wiki reader (call 13), and plan 101's knowledge-cards lane run outside plan 101 (call 20).
- **Hades and Red Dead Redemption 2 may come back empty** (call 21), which would leave 36 or 37 of 38 games, not 38.
- **About 120 copies of the repo will be on disk by the end** (69 old ones now; each is about 53 MB; the disk has 125 GB
  free). Clearing the old ones is a job for the copy script's own prune, never git's, and not for this session.
- **Time.** About 85 helper runs. At about fifteen to twenty per usage window that is five or six windows: through
  tonight and most of tomorrow. The week's counter should end near 70 to 75 percent; it resets Wednesday morning.

## 9. Standing rules while nobody is watching

Plan 102 § 9 in full: the library is never published from the session; a new library reaches the Deck only through the
Developer tab's install route and is put back at the end; a note lane never writes a sentence it cannot point at in a
page the reader fetched; evaluation reports are never committed to this repo; a lane that touches the search service
lands alone, with the fixture check in its landing log; one test chat only; every roadmap move names the row it owes,
and nothing moves to Done without its evidence file. New: nothing personal leaves the Deck (the screenshot copy takes
game pictures only, into the private workshop, and never into this repo); a driver deletes a saved chat only when its
first question is one of the earlier plans' test questions; the pulled picture model and the placed pictures are on
the DR block's put-back list from the moment they are made.

## 10. Keeping the PC and the Deck awake, and usage pauses

The desktop app keeps this PC awake. The rig's keep-awake hold is taken per block and released at each block's end
(holding it for hours is what stuck the suspend overlay last time). Before a planned pause the session leaves a
background timer running that ends at the usage reset, so its finishing wakes the chat (the scheduled check alone did
not, in plan 92). § 12 keeps a pick-up list current: the tip, what has landed, the helpers in flight with their branch
names, and the next three acts, so this chat after a pause, or a new chat, can carry on with nothing re-planned.

## 11. Paperwork and the reports

- **After every landing chain and every Deck block:** the bookkeeper's sweep (§ 5k), one commit; a few lines in § 12,
  committed.
- **New bugs and new checks found on the way:** into the roadmap at the next sweep, into the report, and (one- and
  two-star, cause known) into a helper round the same session, about an hour each. A bug that resists is written up
  and left open.
- **At every stopping point:** the five lines of § 5, "Waves".
- **The report, at the end,** in § 13: what the maintainer must do next; what a player notices; the code work by area
  (file paths, a technical explanation, what popped up and how it was handled, what the maintainer could have done
  differently, as AGENTS.md asks); a plain developer guide to what was built; what failed and why; what is left and
  why; the numbers. The status report (plan 37) gets a dated paragraph; the checks page gets its group; plan 33 gets
  its rows; the Deck tools findings go into `docs/mcp-setup.md`.
- `python scripts/verify.py --full` passes on the final tip before the maintainer is asked to push.

## 12. Progress log and questions

- **2026-11-09, evening (the planning chat, Fable at max):** the roadmap read; six read-only lookups by Sonnet helpers
  (the search blend and the honest answer; the picture path; five answer-screen problems; the test tooling and the
  build checks; the Deck checks' speed; versus, mods and four small bugs), their file and line claims spot-checked
  against the code; the data counted by script (38 games, 583 notes; 15 games with labelled enemy and item notes; the
  wiki and licence each game's notes cite; the note number ranges in use). The maintainer answered eight questions
  (§ 2, calls 1 to 8). The plan, the helper rules, the briefs and the first Deck runbook written. Read, not changed:
  the Deck (reachable, nothing running, sixteen games on the Recent row, Doom 64: Retribution installed and not on that
  row, ten saved chats, the published library 2026.10.25, the build `9bc29b3c0500` from 2026-11-03); the Deck tools
  (0.3.12, armed, no lease, one self-check failing on the debug port); this PC's AI (every model present); GitHub's
  library copy (dated 2026-10-25). Tip `3d86f5b7`, tree clean, in step with GitHub, D140 free. Usage when planning
  ended (about 19:15 EST): 28 percent of the five-hour window (resets 20:00 EST), 9 percent of the week, Fable's own
  counter 16 percent (5, 6 and 11 when planning began). The four plan files are uncommitted; the quick check passes
  with them in place. Waiting for "go".
- **2026-11-09, 19:30 EST: "go".** The maintainer took every default on calls 9 to 21. A fresh chat runs the session
  (Fable; the app started it at extra-high, not high: a chat cannot change its own effort).
- **19:32 to 20:05 EST, the first acts.** The four plan files committed (`d97c88cf`, the tip every helper is cut
  from). Usage at go: 33 percent of the five-hour window (resets 20:00 EST), 10 percent of the week, Fable's own
  counter 18 percent. The Deck: reachable, armed, nobody holding it. D140 is free. The full check on the tip passed
  (322 seconds). The library built once on this PC (583 notes, 38 games) and copied into the measuring helpers'
  copies. The Deck's game screenshots copied to the workshop (`screenshots/plan103-steam/`, 134 pictures in six
  folders). Thirteen copies cut, each confirmed at the tip, and all of wave A started between 19:50 and 20:05: K0,
  T1, T2, T3, T4, X0, R1, R2, V1, G1, S1, B1, B2, the Deck driver for block D0a, and the second opinion's consult 1.
  Each brief's key lines were checked against the code first; one correction went out with a brief (T1's list of
  readers was short by two test files).

- **19:59 EST: the five-hour usage window filled (100 percent).** The session's own slip: it read the counters at go
  (33 percent) and not again before each batch, and fifteen helpers filled the window in under half an hour. Seven
  helpers were cut off mid-work; each kept its work and was resumed with one short message after the 20:00 reset. From
  here the counters are read before every batch.
- **20:00 to 20:30 EST.** Landed, every check green: the bookkeeper's audit (`a3822267`) and the answer-test fix
  (`76ef6a7a`). Then eight finished helpers as one batch (the free-to-use sources check, the question loader, the
  Deck-check scripts, the versus groundwork, the honest answer switched off, the summing-up fix, the mod tips, the
  page-reader fix; tip `bdce2070`): **one old Python test went red** (the new mod tips changed which tip comes first
  for a crash question in a test that mocks the meaning search). The tips helper is finding whether that is a real
  change for a player or the test's own assumption. Nothing else lands until it is green; a second batch (two small
  fixes, the picture set, the covers and notes line, the starter box) is prepared behind it.
- **What the helpers found, in short.** The answer test's second and third tries were being asked as follow-ups of
  the first, so every older answer-quality number needs measuring again; there is no "answer cache". The new baseline:
  the AI keeps 73.4 and 71.8 percent of its notes' facts over two runs (so two points either way is noise), and on
  the eight questions its notes cannot answer it said so in its own words 0 times in 24, in both runs. The
  "one open cover shows every answer's notes" entry is not a bug (a test through the screen passes as the code
  stands); the same helper found a real one instead: an answer whose cover the plugin opens by itself never showed
  its notes line. The mic log noise came from the screen's clean-up, not from the two callers the brief named.
  The page reader is refused by two wikis when it asks by revision; it now falls back to asking by title, and pages
  that came back nearly empty now come back whole.
- **Notes so far.** Written: Left 4 Dead 2 (15), Fallout 4 (14), Red Dead Redemption 2 (14), Cyberpunk 2077 (15),
  Mario Party (15), Mario Party 2 (14), Mario Party 3 (15), Mario Party 6 (15), Mario Party 7 (15), Super Smash Bros.
  (15), Melee (15), Grand Theft Auto III (15): 177 notes in twelve games. A separate checker has read ten of the
  twelve files sentence by sentence (every one "small fixes", all made); the
  licence reviewer has read four. **Hades gets no notes:** its wiki is non-commercial only and Wikipedia has too
  little. Half-Life 2 waits on its wiki, which was read-only tonight. Nine games are not started.
- **The Deck, block D0a (19:40 to 20:15 EST).** Passed: setup; the old test chats cleared (six deleted, five chats
  left); the smoke check; opening the plugin right after a reload, 3 of 3. Not settled: the hidden spoiler box on
  Doom 64 (the game launched by its title on the first try; neither boss question drew a box); the Undo walk (the
  page kept its focus six times of six, second night: it goes to the maintainer's list as proven by its tests only).
  The picture check: a placed picture showed first in the attach list and attached; the question timed out twice.
  **The block ended with the Deck stuck:** God of War still running, about 770 MB of memory free, reads over SSH
  timing out, and the rig unable to close the game. Nothing more runs on the Deck until a person closes the game.
- **Usage at 20:26 EST:** 43 percent of the five-hour window (resets 01:00 EST), 25 percent of the week, 29 percent
  on Fable's own counter.

- **Stopping point A, 21:30 EST (tip `081693d2`, every check green).**
  1. *Landed:* the bookkeeper's two sweeps; the answer-test fix; the free-to-use sources check; the question loader;
     the Deck-check scripts; the versus groundwork; the honest answer (switched off); the summing-up fix; the mod
     tips; the page-reader fix; the two small fixes; the picture set; the covers and notes line; the starter-models
     box; and notes for ten games (147 notes). *Turned down on its numbers:* the crowding fix (four versions
     measured; the best one gains about nine questions and loses two when the game's name is typed; the record and
     the finished patch are in the workshop's research folder, and the trade is the maintainer's). *Stays off:* the
     honest "I don't know" (the wording works, 17 or 18 of 24 when it reaches every question, but the plugin only
     notices the gap in 3 of 24 answers; letting it check in Speed mode alone would reach 12 of 24; the record is in
     the workshop).
  2. *The Deck:* block D0a ran (four passes, three rows not settled), then the Deck froze: a picture question with
     God of War running used all its memory. The maintainer restarted it by hand at 21:12. New rules for every
     later block: no picture question over a heavy game, free memory read before every question and launch, stop
     at two timeouts. Block D0b started at 21:20 with a fresh driver.
  3. *Usage:* 70 percent of the five-hour window (resets 01:00 EST), 28 percent of the week, 33 percent on Fable's
     own counter. No new helper starts before the reset.
  4. *Next:* D0b's readings, then lane F1 (the answer screen's D-pad) with them in hand; the rewording pass on six
     notes files; the licence read of Melee and Grand Theft Auto III; the Left 4 Dead 2 versus notes; the blind test
     questions for the landed notes; notes for the nine games not started, and Half-Life 2 and Black Mesa again if
     their wiki is back; the picture-search lane; deploy 1 and block D1.
  5. *Waiting on the maintainer:* questions 3 to 6 below, and three ten-note samples in the workshop's checks folder
     (`plan103-sample-earlier.md`, `plan103-sample-B.md`, `plan103-sample-C.md`; wait for the session's word, two
     are being refreshed after last fixes).

- **Block D0b, 21:14 to 21:42 EST (old build, nothing deployed; the Deck never froze, lowest free memory 6,895 MB).**
  Put-backs from D0a done: the placed picture is gone and the screenshot switch is off again. Both test chats
  survived the restart. The read-back script worked on all six runs. Measured: a fully covered answer shows no notes
  line at all, before or after opening, though three notes were attached (a partly covered one shows it only after
  opening); a Brotato answer sits behind a shut cover on Default; Up from a checklist's step 1 lands on the Copy
  icon and Down from the Copy icon skips every step (3 of 3 each); the "This answer / Session" strip is reached by
  the first Down when no notes line sits above it and by the second Down when one does (15 tries, the page never
  lost focus, so "cannot be reached" was not reproduced); the old build writes no summing-up log line. Two rows not
  settled: the live time to the first word of a long chat's answer was not measured, and the runbook's "Terse mode"
  control does not exist on the Settings tab (a runbook mistake). The Deck is left with the plugin open, the mode
  chip on Strategy, no game, the AI unloaded and the hold released. Handover:
  `workshop:planning/assets/103-handover-D0b.md`. Lane F1's task text is ready in
  `.scratch/p103/brief-F1-additions.md`.
- **21:45 EST, a pause for the usage window.** 79 percent of the five-hour window (resets 01:00 EST), 29 percent of
  the week, 33 percent on Fable's own counter. Past the 75 percent line, so no helper starts before 01:00. A
  background timer runs to the reset; the first batch after it is F1, the rewording passes, the licence read of
  Melee and Grand Theft Auto III, the versus notes and the first note lanes.

- **00:38 EST, 2026-11-10: the maintainer said to start again** with 22 minutes left in the window (84 percent).
  Five helpers started at once (F1, the licence read of Melee and Grand Theft Auto III, the versus notes, Yoshi's
  Story, Diddy Kong Racing); the rest at the 01:00 reset.
- **The state at 02:20 EST (tip `b1827281`, every check green).**
  1. *Landed since stopping point A,* in six batches (three of them needed one fix each before the checks passed):
     notes for ten more games (Grand Theft Auto III, Melee, Yoshi's Story, Diddy Kong Racing, Fallout: New Vegas,
     Brotato, Palworld, Skyrim, Hollow Knight, DOOM Eternal), so 20 of the 23 games; the Left 4 Dead 2 versus notes
     (15) and the seven re-filed notes; the "own words" pass on eight notes files (Nintendo's trophy text had been
     copied into nine Melee notes; all rewritten); 294 blind test questions for ten games; lane F1, the answer screen's
     D-pad, after the second opinion and two additions. 33 notes files and 477 notes are on the tip.
     *No notes this session:* Hades (licence), Half-Life 2 and Black Mesa (their wiki's database was read-only both
     nights). *Cost measured:* with the versus notes in, 9 of the 18 labelled Left 4 Dead 2 questions find their note
     in first place (11 before), 17 in the first three (unchanged).
  2. *The Deck:* asleep since at least 01:10 EST; a button press through the rig did not wake it. Deploy 1 and block
     D1 have not run. The runbook for D1 is written (`docs/planning/assets/103-runbook-block-D1.md`); it installs the
     session's library, because the mod tips and the new notes live in the library and the Deck still holds the
     published one. The session deploys with `scripts/build.ps1` from the shared checkout, as plan 102 did.
  3. *Usage:* 70 percent of the five-hour window (resets 06:00 EST), 41 percent of the week, 43 percent on Fable's own
     counter. One helper is running (the bookkeeper's sweep K2); nothing else starts before the reset.
  4. *Next, after the reset:* test questions for the last ten games, the versus notes and the mod tips (Q4 second part,
     Q5, Q6); the numbers in the middle (X1); the picture-search lane (P2); the corrections to older notes (lane M, a
     list is in the K2 result list); the chips lane if a slot is free (C1); deploy 1 and block D1 as soon as the Deck
     is awake, then deploy 2 and block D2 for F1.
  5. *Waiting on the maintainer:* the Deck's power button; questions 3 to 8 below; six ten-note samples in the
     workshop's checks folder (`plan103-sample-earlier.md`, `-B`, `-C`, `-D`, `-E`, `-F`; B and C were drawn before
     the rewording pass, so read the notes files' final text beside them).

- **02:45 EST: the bookkeeper's sweep K2 landed** (`127fe2f6`), then the session paused for the usage window.
- **06:02 EST, 2026-11-10: the window reset** (1 percent of five hours, 42 percent of the week, 44 percent on Fable's
  own counter). The Deck was still asleep. Combine OverWiki still answered "Database is read-only" (the third try), so
  Half-Life 2 and Black Mesa stay without notes. Seven helpers started at 06:05, two more later.
- **The state at 07:05 EST (tip `d88a7430`, every check green).**
  1. *Landed this morning,* in five landings (one needed a fix: the chip order had added an optional setting to a
     function whose call shape a test keeps frozen): blind test questions for the last ten games that got notes (292
     rows, so 586 rows in 20 files); labels on six of the eight unanswered versus questions; 36 mod-tip questions;
     corrections to thirteen sentences in older notes that their wiki pages contradict (lane M; the Molotov note left
     alone, its pages do not clearly disagree); **the suggestion chips ordered by the last question** (lane C1: after an
     answer the game's chips lead with up to four notes closest to it; spoiler-kind notes come forward only if the
     question named them; the screen's rotation still picks at random after the first deal, so the closest note is
     sure of one spot only); **the picture's own guess for the note search, switched off** (lane P2: built in both
     rounds; only four of the 29 labelled pictures name a note and none shows a boss, too few to decide on).
  2. *Measured (lane X1, the numbers in the middle; reports in the workshop's research folder with `p103-middle`):*
     the library now holds 891 notes (308 new this session). On the same 628 held-back questions the right note is in
     the first three for 572 (581 before); the thirty meaning-only questions fell from 23 to 18 while the meaning
     search alone still finds 28: **the crowding grew with the new notes.** Of the first 294 blind questions, 281 find
     their note in the first three. Tips unchanged. Facts kept in answers 70.1 and 68.9 percent (73.4 and 71.8
     before), just outside the gap between runs. *The crowding fix measured again on today's library (lane R1b):*
     still not landing. It lifts the thirty meaning-only questions to 25 and brings back 12 older questions, but it
     loses 5 of the new ones, loses seven right notes net on the plugin's own search, and moves an exact word match
     off first place on seven questions. Its cause: every game's "Starting out" note ranks high by meaning and gets
     lifted past a note the word search really found. Record: `kb-crowding-fix-2026-11-10-p103-r1b.md`.
  3. *The Deck:* still asleep; nothing deployed; no block has run since D0b. The runbooks for blocks D2, D3 and DR are
     written (`docs/planning/assets/103-runbook-block-D2.md`, `-D3-DR.md`). A watcher on this PC ends when the Deck
     answers on the network.
  4. *Usage at 06:35:* 16 percent of the five-hour window (resets 11:00 EST), 44 percent of the week, 46 percent on
     Fable's own counter.
  5. *Running:* the bookkeeper's sweep K3 and the final numbers (lane X2). *Next:* land K3; then, if the Deck wakes,
     deploy and blocks D1, D2, D3, DR; then the end audit, the full check, the report and the checks page. *Waiting on
     the maintainer:* the Deck's power button (question 8); questions 3 to 7.

**Questions for the maintainer (the safest choice is taken meanwhile):**

2. **Answered 2026-11-09, 21:12 EST:** the Deck was frozen with God of War in the background and an answer half
   written; the maintainer restarted it by hand. New roadmap bug to file: a question asked over a heavy game can
   use all the Deck's memory and freeze it; the plugin should check free memory before loading the AI.
3. **The picture set has no boss pictures** (29 pictures, 11 games, one enemy, four with a library note). The marks
   test needs at least fifteen. *Taken meanwhile:* the marks test waits; the picture-search work will be measured on
   what there is and lands switched off unless it clearly earns "on". Say where more play pictures are, or allow
   public boss screenshots for a private test set, or leave the marked-screenshot idea open as "not measured".
4. **Red Dead Redemption 2's wiki licence.** Its live licence line says CC BY-SA with no version; Fandom's own help
   page says 3.0 for all its wikis; one page on that wiki from 2009, marked "may be outdated", still says GFDL.
   *Taken meanwhile:* stored as 3.0, like the library's four other Fandom wikis, with the evidence written beside the
   notes. Confirm before anything is published, or say to drop that game's notes.
5. **The crowding fix: the safer setting lands; the stricter one is yours to choose** (the second opinion's table in
   § 7 has the trade). *Since then:* nothing landed (it failed its own rule on the night's numbers), and the fix was measured
   again on 2026-11-10 on the bigger library: it still loses more than its rule allows (the state at 07:05 above
   has the numbers). *Taken meanwhile:* the search is unchanged. The call left is whether a later session should
   try the fix with "Starting out" notes left out of the lift.
6. **The starter-models box:** the paragraph that explains "Turn on and download" sits last, so it is hidden until
   Down is pressed. Moving it up changes the order in every download box. *Taken meanwhile:* left where it is.
7. **The Brotato wiki's licence** is read from its page footer (the wiki's own data gives none). The older Brotato
   notes already rely on it. *Taken meanwhile:* stored as CC BY-SA 4.0. One look at a Brotato wiki page's footer
   settles it.
8. **The Deck is asleep** (since about 01:10 EST on 2026-11-10) and the rig cannot wake it. *Taken meanwhile:* nothing
   deployed, block D1 not run. Press its power button and say so.

1. **The Deck holds far fewer play pictures than the plan hoped.** Steam's screenshot folders on the Deck cover six
   games, and 77 of the 134 pictures are from one game (Deep Rock Galactic: Survivor). Another 281 pictures sit in
   Steam's own folder (pictures taken on Home or in menus, which may show more than a game). *Taken meanwhile:* only
   the six game folders were copied; Steam's own folder was left on the Deck. The picture set (lane P1) will be built
   from what there is, plus the eleven older pictures, and will say plainly if it falls short of "ten games, ten
   bosses". If you have play pictures elsewhere, or want Steam's own folder looked through, say so.

**Pick-up list (kept current; a new chat can carry on from here):**

- Tip: `d88a7430`, every check green. The session's own running notes, with every helper's id, every hand-out and the
  lists not yet acted on, are in `.scratch/p103/` in the shared checkout (not in git): `session-notes.md` first.
- Land with `scripts/land_lane.sh <branch> <base> .scratch/p103`, one at a time (`.scratch/p103/land_queue.sh` runs
  the lines of `queue.txt` in order and logs to `chain.log`). Read the exit code. On a failed check the picked commits
  stay on the tip: fix forward with one more commit. A helper's final report can be pulled from its transcript with
  `.scratch/p103/last_report.py`; every helper brief of this session with `.scratch/p103/agent_prompts.py`.
- In flight at 07:05: the bookkeeper's sweep K3 (copy `p103-k3`; its result list is `.scratch/p103/k3-results.md`),
  to land alone when it reports; the final numbers, lane X2 (copy `p103-x2`; commits nothing; reports to the
  workshop's research folder with `p103-after`).
- Not landing: `refactor/p103-r1` and `refactor/p103-r1b` (the crowding fix, turned down twice on its numbers).
  Not written: notes for Hades (licence), Half-Life 2 and Black Mesa (their wiki read-only on three tries). Blocked on
  boss pictures: P3 and P4. Switched off: the honest "I don't know", the picture's guess.
- The Deck: build `9bc29b3c0500` (nothing deployed yet); published library 2026.10.25; five saved chats; the mode
  chip on Strategy. Asleep since about 01:10 EST. When it wakes: `deck_status`, check no game runs, `scripts/build.ps1`
  from the shared checkout at a green tip with nothing landing, read the build hash
  (`sha256sum ~/homebrew/plugins/bonsAI/dist/index.js | cut -c1-12`), then one fresh driver per block with that hash:
  D1 (`103-runbook-block-D1.md`), D2 (`-D2.md`), D3 and then DR (`-D3-DR.md`; tell D3's driver the chip order landed).
  One deploy serves all of them now that everything has landed.
- The end, after the Deck or without it: the bookkeeper's end audit (K9, the same brief as K0); `python
  scripts/verify.py --full` on the final tip; the report in § 13 in § 11's shape (the second opinion's consult 6
  before it; three of six consults used); the checks page's "plan 103" group (the six ten-note samples, the picture
  labels, the quick-start words, the caption, the starter box on a fresh install, the crowding trade, the honest
  answer's Speed-mode option, the two wiki licences, P102-UNDO-FOCUS-01, and every Deck row still owed); plan 33's
  rows; plan 37's dated paragraph.
- Budget: read the three counters before every batch. This morning nine helpers and five landings used about 20
  percent of a five-hour window.

## 13. Report

To be written at the end, in the shape § 11 names.

## 14. Subagent reports and follow-ups

The second opinion (§ 7): every consult logged above, with what it changed. The licence reviewer: reads every notes
file and the mod tips before they land; its findings and the lanes' fixes are recorded here. The security reviewer:
reads P4 if it is built (a new method that hands a picture to the screen), and T4's two scripts (they reach the Deck
over SSH). Focus and layout: F1 carries the second opinion's read before landing, and F1, F2 and P4 carry their Deck
rows as the gate.
