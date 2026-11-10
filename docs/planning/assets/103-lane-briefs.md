# Plan 103: the briefs, one per helper

How a brief is assembled: the session hands each helper `103-helper-rules.md`, the section below with its letter, the
tip hash, the absolute path of its copy, and the plan number (103). Nothing else is needed. A section says: what a
player sees today, where it comes from (files and the reading behind it), what to build, the files owned, the test at
the Deck's level, and the Deck check that proves it (the row). Evidence files are named `plan103-<ROW>.json` by the
driver, never by a helper. Line numbers are as read at tip `3d86f5b7` on 2026-11-09 by the session and six read-only
lookups, spot-checked against the code; a lane that finds a line has moved re-greps and says so in its report.

Model and effort per lane are in the plan's § 4 and § 5. A lane that finds its brief wrong says so and stops rather
than building the brief's mistake.

---

## K0 — The bookkeeper's audit before anything lands (★ docs, Sonnet medium; the same brief again as K9 at the end)

**What this is.** The knowledge-base roadmap must be right before the first lane lands, and it has almost no room
left. Make room, write the decision, take the answered calls off the list, and correct what planning found. One commit;
every change named in your report; invent no result. You work in your own copy and are landed like a lane.

**In this order:**
1. **Make room first.** `docs/roadmap-kb.md` is 24.8 KB against a 25 KB limit, `docs/testing.md` 161.6 KB against 165,
   `docs/roadmap.md` 97.7 KB against 100 (`scripts/ratchet.json`). Move older dated sentences, word for word, from
   `docs/roadmap-kb.md` to `docs/roadmap-kb-details.md` under a new heading "Plan 103 notes moved from the
   knowledge-base roadmap (2026-11-09)", each entry keeping a link to them, until the file is at 21 KB or less. Move the
   oldest closed rows of `docs/testing.md` to `docs/archive/testing-closed-2026.md`, as plan 100's sweep did, until it
   is at 150 KB or less. Nothing is deleted; say in your report what moved.
2. **Decision D140**, appended to `docs/audit/maintainer-decisions-locked.md` in the house shape of D139: the heading
   "D140 — LOCKED 2026-11-09 (raised 2026-11-09) — Plan 103, the knowledge-base wave six: the twenty-one calls", then
   plan 103 § 2 word for word (calls 1 to 8 as answered; calls 9 to 21 with the answers your task names, the defaults
   unless it says otherwise) and the usage figures at go (your task gives them). Check 140 is free first; D138 is
   reserved by plan 101's asset file and must not be taken.
3. **"Calls waiting on you"** in `docs/roadmap-kb.md`, by D140:
   - the picture sentence: kept. Remove the call; the Deck-check-owed entry "Screenshot reading ignored the game name"
     says "confirmed by the maintainer, D140" and still owes row P102-PICTURE-01.
   - the crowding fix: to be built. Remove the call; the Bugs entry says "the maintainer's call 2026-11-09: build the
     fix (plan 103 lane R1)".
   - the card style pass: closed. Remove the call; the Next entry moves to the knowledge-base Done list in
     `docs/roadmap.md` as one line with its numbers (48 of 90 against 44 of 90, a tie) and "closed by the maintainer,
     D140, 2026-11-09"; the full entry goes to the completed archive file.
   - the story-cover check: to be re-run with more tries (plan 103 lanes T2 and X0). Remove the call; keep its numbers
     in the long notes.
   - the two reads stay (the monthly ten replies; plan 100's wording). Add one line: "Your ten-note samples" (one for
     the 125 notes from plans 100 and 102; one per batch of plan 103), each added when its sample file exists.
4. **The two notes entries in "Deck check owed"** (Baldur's Gate 3's seven; the eight thin games' 118): reword to the
   sample rule (D140, call 4): each closes on the maintainer's read of ten random notes, not of every note.
5. **Corrections planning found.** Check each against the code or the evidence file before you write it; if a check
   fails, leave the entry as it is and say so.
   - Bugs, "A spoiler-covered answer draws no notes chip": the code hides the notes line on purpose while a cover is
     shut (`src/features/knowledge-library/buildKbNotesBlockElement.tsx`, `kbNotesBlockedBySpoiler`, about line 196, and
     the comment at about line 232). Read `workshop:test-evidence/plan102-P102-THIN-GAMES-01.json` and
     `plan102-P102-FINDPC-01.json` and say which file holds the Fallout 4 computer-terminal sighting; if it is the
     second, say so in the entry (it is a weak-match case, not a covered one). Status stays OPEN; add "by design in the
     code; plan 103 measures it (row P103-M-COVERED-NOTES) and draws a caption (lane S1, D140 call 14)".
   - Bugs, the Brotato cover entry: add the cause read 2026-11-09: the rule that opens a cover by itself looks only at
     the running game, and Brotato is on the no-story list by its Steam number only, in neither name list (screen or
     back end). Plan 103 lane S1.
   - A new Bugs entry, ★★ `[KB]` `[ui]`: **"Opening a spoiler cover on one answer lets the notes line show under every
     answer"**, OPEN, found 2026-11-09 by reading the code (one page-wide "a cover is open" switch), not seen on the
     Deck; a protected note's name could show under an answer that is still covered. Plan 103 lane S1.
   - Bugs, the crowding entry: add one sentence from the code reading: nothing caps the word list; a note the word
     search missed is given a place one past the end of that list, so its credit shrinks as the list grows.
   - Bugs, "The answer test's samples are not independent": add: no seed is sent with a question, and no answer cache
     was found in the back end though the lessons file says one exists; plan 103 lane T2 settles it.
   - Next, the online and versus entry: add: the August plan's file paths are stale; the seven "Playing as" notes it
     planned already exist under another kind; eight of eighteen versus test questions find nothing; plan 103 lanes V1,
     V2 and Q6 build the first three steps for Left 4 Dead 2, Counter-Strike 2 stays out.
   - Next, the mod knowledge entry: add: plan 103 runs the basics tips (plan 101's knowledge-cards lane) and the CC0
     change (lanes G1 and T3); the device side stays plan 101's.
   - Next, the screenshot measurement entry: add the count: the set is 11 pictures and none shows a boss.
   - Deck check owed, the hidden spoiler box entry: the rig can now launch a shortcut by its title (Deck tools 0.3.12),
     so the row no longer needs the maintainer's hand launch; plan 103 block D0a tries it.
   - Deck check owed, the thumbs-down Undo entry: its "before the fix" reading (row P98-DEMOTE-01-game-try2) can no
     longer be taken, because the fix has been on the Deck's build since 2026-11-03; say so and drop that half. The
     walk itself (row P102-UNDO-FOCUS-01) is still owed and runs in block D0a.
   - Next, Phase 5: say what closes it (plan 103 § 5f); and a new Next entry, ★★★ `[KB]`: **"Suggestion chips ordered
     by your last question"**, OPEN, split out of Phase 5's second half by D140 call 7; plan 103 lane C1 builds it if a
     slot is free.
   - "Where things stand": dated 2026-11-09; the library built on 2026-11-03 is still unpublished (GitHub's copy is
     dated 2026-10-25).
6. **`docs/testing.md`:** one row, status open, for every check in plan 103 § 6 (the rows named in the blocks table,
   and the six measurement rows P103-M-COVERED-NOTES, P103-M-BROTATO, P103-M-CHECKLIST, P103-M-DETAILS-STRIP,
   P103-M-SUMUP, P103-M-TAB-SECTIONS), each saying what it needs and what a pass is, in the shape of the plan 102 rows
   beside them. A row that already exists (STRAT-SPOIL-NAME-01, P102-UNDO-FOCUS-01, P102-PICTURE-01,
   P89-RIG-OPEN-AFTER-RELOAD) is not repeated.
7. Every entry you touched: the status word agrees with its newest dated note; five lines at most; every link resolves.

**Files owned:** `docs/roadmap-kb.md`, `docs/roadmap-kb-details.md`, `docs/roadmap.md` and its completed archive (item
3 only), `docs/roadmap-shelved.md`, `docs/testing.md` and its archive, `docs/audit/maintainer-decisions-locked.md`. End
with `python scripts/docs_toc.py` if a heading changed, then `python scripts/verify.py --quick`. Commit when told.

**As K9, at the end:** the same checks after the last landing and the last Deck block, from the session's final result
list: every entry moved this session names its row and its evidence file (confirm each file exists in the workshop);
every number in "Where things stand" is counted from the data files that day; the three half-done entries read as plan
103 § 5f says; every roadmap file is under its limit.

## K — A sweep after a landing chain or a Deck block (Sonnet medium, the bookkeeper's file as instructions)

The session hands you a result list copied from the landing logs and the evidence files. A landed fix moves from Bugs
or Next to "Deck check owed", naming the row it owes. A Deck pass moves to Done in `docs/roadmap.md`'s knowledge-base
list with its evidence file; a fail goes back to where it was with what was seen; UNCLEAR and COULD NOT RUN are written
as such, never as a pass. The testing rows and the changelog change in the same commit. Confirm every evidence file
exists before you cite it. Keep every roadmap file under its limit (move older text to the long notes, word for word).
You work in your own copy; do not commit while a landing runs in the shared checkout unless your task says so.

---

## T1 — Test questions can live in many files (★★ `[KB]` `[QA]`, Sonnet high)

**What is wrong today.** All 936 search-test questions sit in one file, `tests/fixtures/kb_eval_v2.json` (an object
with `queries`, `status`, `default_split`, `version`). Every helper that writes questions appends to its end, so two of
them clash (plan 102: lane Q2's first commit against lane I's rows). This plan has four question helpers and 23 games.

**Where it is read.** Scripts: `scripts/kb/eval_kb_embed_models.py` (`_load_fixture` at about line 221, called at about
1744 and 1972), `scripts/measure_kb_thin_match.py` (about line 47), `scripts/measure_kb_floor_holdout.py` (about line
40). Tests that open the file themselves: `tests/test_asked_entity_extraction.py` (348),
`tests/test_compat_patterns_plain_words.py` (112), `tests/test_compat_topic_router.py` (301),
`tests/test_kb_game_tip_meaning.py` (225), `tests/test_knowledge_base_service.py` (521), and `tests/test_eval_kb_arms.py`
(217, 243, 260, 282). Search for the file name again yourself; this list may be short.

**Build.**
1. One loader that every reader above calls: the main file's rows, then every `*.json` under a new folder
   `tests/fixtures/kb_eval/` in name order (each an object with a `queries` list; the `status` and `default_split`
   rules as the main file's). `scripts/kb/build_rag_db.py`'s `_folder_json_files` (about lines 424 to 435) is the shape
   to copy. An id repeated across files is refused, and the message names both files. An unknown key is refused.
2. Every reader goes through it, so a question in a new file counts everywhere: the label test
   (`test_every_label_names_a_card_that_exists`), the status test, the split test. `tests/test_compat_topic_router.py`
   pins the exact ids of missed rows (about lines 296 to 360): keep that pin for the rows it names and make a new
   file's rows pass by rule, not by being added to the list; say in your report how.
3. The search test's saved copy of the library is rebuilt when the seed, the tips or the builder change
   (`eval_kb_embed_models.py`, about lines 270 to 279). It does not watch `data/kb/notes/` or `data/kb/glossary/`. Make
   it watch both, so a new notes file marks the copy stale.
4. Put one small file in the new folder as the example and the proof: move nothing out of the main file; write two new
   harmless rows of your own for a game that already has notes, or leave the folder holding only a README if the
   loader's tests prove the path. Say which.

**Prove the guard by breaking it:** a temp folder with a repeated id must fail the loader's test; say in the commit
which failure you saw. **Files owned:** the loader (a new file where both the scripts and the tests can import it; the
tests load scripts through `tests/script_loader.py`), the three scripts' loader calls, the six test files' reads, the
new folder. **The test at the Deck's level:** none; the check is the search test reading 936 plus the new rows and every
test above green.

## T2 — The answer test's three tries really are three (★★ `[KB]` `[QA]`, Sonnet high)

**What is wrong today.** Plan 102's lane E found the same question gave the identical reply three times, so six
questions at "0 of 3" can be six tries, not eighteen. Every facts-kept number is weaker than it looks, and this plan's
honest-answer lane is judged by this test.

**Where it comes from.** `scripts/kb/eval_kb_answers.py`: the sample loop at about lines 1995 to 2009 (the pairs mode
has its own at about 1930); the sample number only labels the result (about line 1033). The call goes through the
plugin's real request function (about line 921) and ends in `py_modules/backend/ask/ollama_chat_stream.py` (about
lines 198 to 211), which sends `num_predict`, a temperature (0.42 in Strategy, 0.4 otherwise) and the window size.
**No seed is sent.** A search of the back end found no cache of replies, yet `docs/lessons-learned.md` (line 271) and
`.claude/agents/deck-driver.md` (line 71) both say an "answer cache" serves a repeated question back word for word on
the Deck (27 seconds the first time, 1 second the second).

**Build.**
1. **Find out why first, one hour at most.** Run one case three times and compare the replies. Send the same request to
   the model three times by hand at the same temperature and compare. Search `src/` and `py_modules/` for anything that
   returns an earlier reply for a repeated question, under any name. Your report says which it is: the model repeating
   itself with no seed, a cache (file and line), or something else.
2. **A seed per try.** Each try gets its own seed, made from the case id and the try number, printed in the report so a
   run can be repeated. Pass it through a wrapper in the script (the script already patches the plugin that way); no
   production file changes. If a cache in the plugin has to be gone round, stop and report: that is the session's call.
3. **Two honesty counts instead of one.** Today "admitted not knowing" (`admitted_unknown`, about lines 703 to 713)
   counts the back end's own footer line as an admission (`UNKNOWN_ADMISSIONS`, about 675 to 686), because the scorer
   reads the reply with the footer already added. Split it: "the back end's line showed" and "the AI said so in its own
   words" (the admission found in the reply with the footer lines taken off). The summary, the per-case table and the
   saved JSON carry both.
4. **More tries for one check:** a way to run a named set of cases with N tries (the five story-beat questions at nine
   tries each is the first use).

**Tests:** `tests/test_eval_kb_answers.py` (the classes `EvalKbAnswersUnknownTests`, `...UnknownFixtureTests`,
`...UnknownReportTests` are the neighbours; reuse their setup): two tries of one case carry different seeds; the two
counts both ways; the report header says the seeds. **Files owned:** the script, its test file,
`tests/fixtures/kb_answer_eval.json`. **The test at the Deck's level:** none; lane X0 runs the fixed test twice on the
unchanged library, and the gap between those two runs is the noise band every later comparison is read against.

## T3 — The library's checks accept free-to-use sources (★ `[KB]`, Sonnet medium)

**What is wrong today.** The mod-knowledge sources report (`workshop:planning/assets/101-mod-knowledge-sources.md`)
found the best mod data is published CC0 (no conditions), and the publish check refuses it.

**Where it comes from.** `scripts/kb/publish_corpus.py`, `ALLOWED_SOURCE_LICENSES` (about lines 68 to 70), the only
check that refuses. `scripts/kb/build_rag_db.py`, the licence link table `_LICENSE_DEED_URLS` (about lines 61 to 71) and
its fallback (86 to 92), and the version check (96 to 109). `scripts/kb/extract_wiki_notes.py` reads the allowed list
(about 146 to 158) and has its own link and wording patterns (163 to 177).

**Build.** Accept `CC0-1.0` in all three places, written the way the library writes its other licences, with its link
(`https://creativecommons.org/publicdomain/zero/1.0/`). The generated credits file lists a CC0 source in its own group
and says no conditions apply and the source is credited as a courtesy. **Tests both ways:** a note marked `CC0-1.0`
passes the publish check; a made-up licence is still refused; the version check accepts the new name. No note in this
plan uses it; this opens the door the roadmap entry names as its next step. **Files owned:** the three scripts and
their tests. **The test at the Deck's level:** none.

## T4 — One-call Deck checks (★★ `[QA]`, Sonnet high)

**What is wrong today.** One knowledge-base check on the Deck (ask, see which notes attached, count the covers, save
the evidence) costs fifteen to twenty-five tool calls, and nothing reads the result back in one go. A picture check
depends on a Steam + R1 press that saved nothing in two tries.

**Models to copy.** `scripts/probe_deck_ui_look.py` (how a script reads the open panel on the Deck over Steam's
debugging port, run as `ssh deck@<ip> 'python3 - --json' < script`; it presses nothing) and `scripts/deck_send_ask.py`.

**Build (new files only).**
1. `scripts/deck_kb_readback.py`, run the same way, pressing nothing, printing one JSON object about the newest answer
   on the Main tab: whether it has finished; the notes line (its header text, and the note names when it is open); how
   many spoiler covers the answer holds, shut and open; whether the "No close match" or "Not in my notes" line is
   there; the game named in the Context line; the focused control's label and whether the page has the window's focus;
   and the plugin log's newest attach line (the log folder is read on the Deck; the line is the one
   `kb_attach_log_line` writes). Find the class names in `src/` yourself (`bonsai-kb-notes-block` and `bonsai-spoiler`
   are the stems) and pin them in a test, so a rename breaks the test and not a Deck night.
2. `scripts/deck_place_picture.py`, run from the PC: copies named pictures from the workshop into the Deck's Steam
   screenshot folder for a given app id (the folder the plugin's attach screen reads:
   `py_modules/backend/media/screenshot_media.py`, about lines 125 to 183), writes a list of exactly what it placed
   beside the pictures on the PC, and with `--remove` deletes exactly those files and nothing else. It refuses any
   target outside a `screenshots` folder.

Both print key names only, never a settings value. **You never run either against the Deck:** the driver does, in
block D0a. **Tests:** the parsing as plain functions against a saved page snippet (the shape of
`scripts/probe_deck_ui_look.test.mjs`); the place script's refusal and its remove list. **Files owned:** the two
scripts and their tests. The security reviewer reads both before they land.

---

## X0, X1, X2 — The numbers, before, in the middle and at the end (★★ `[KB]`, Sonnet medium, long jobs)

Nothing in the repo changes. Every report file goes to the workshop's research folder with the date and `p103` plus
your label in its name; your report carries the numbers and the exact commands. One measurement at a time; say how
long each took. If time runs out, report what finished. Read each script's `--help` first; flags drift.

**X0, before anything lands:**
1. The search test: `python scripts/kb/eval_kb_embed_models.py --arms-only`, forcing a rebuild of its saved library
   (until lane T1 lands it does not notice new notes files). Keep the per-question output; rename the two files
   `-p103-before`. Report, for the held-back questions, how often the right note is in the first three for the blend,
   the meaning search alone and the word search alone (92.5, 92.4 and 85.0 on 2026-11-03), and the thirty meaning-only
   questions (23 found by the blend, 28 by the meaning search alone).
2. The tips reach: `python scripts/measure_kb_floor_holdout.py --json .scratch/tips-before.json --label p103-before`
   (19 of 24 reach a tip, 17 the right one, none wrong on 2026-11-03).
3. The picture baseline: `python scripts/kb/eval_screenshot_reading.py` on today's 11 pictures (they are in the
   workshop under `screenshots/plan98`; the script skips a picture it cannot find, so say how many it scored).
4. **After lane T2 has landed (the session says when):** the answer test on first turns, twice, on the unchanged
   library: `python scripts/kb/eval_kb_answers.py --samples 3 --label p103-before-run1` and `-run2`. Report facts kept,
   contradictions, both honesty counts over the eight unanswerable questions, and the gap between the two runs: that
   gap is the noise band. Then the five story-beat questions at nine tries each: how often a cover showed (11 of 15 on
   2026-11-03, 14 of 15 on 2026-10-25).

**X1, after wave B (the session names what landed):** items 1, 2 and 4 again on the landed tip with a fresh library
build; the blind questions for the six original titles: found in the first three, how many of how many.

**X2, the final library:** everything again; the 23 games' blind questions; the eight versus questions; the mod tips'
questions; the picture set v1 with and without the picture's guess if lane P2 landed it. One table: before, middle,
after, the report file's name.

---

## R1 — The crowding fix (★★ `[KB]`, the search path; Sonnet high; lands alone)

**What a player sees today.** After a game gains notes, a note that only shares one stray word with the question
("first", "will", "keep") can outrank the note that actually answers it. Plan 102 found five held-back questions that
lost their note this way, and the blend finds only 23 of the 30 meaning-only questions that the meaning search alone
finds 28 of.

**Where it comes from.** `py_modules/backend/knowledge/knowledge_base_service.py`: the blend is `_fuse_cards_by_rrf`
(about lines 757 to 861, called at about 1201), with `RRF_K = 60` and equal weights (721 to 723). The word list reaches
it with up to `HYBRID_FTS_SHORTLIST_K = 30` notes (line 200; the only other cut is the score floor in
`knowledge_base_search.py`, line 61). A note the word search did not return is given the place
`fts_missing_rank = len(cards) + 1` (line 819). So with three word hits a missed note sits at place 4, with ten at
place 11, and a tenth-place stray-word hit earns almost the same credit as a miss. Nothing caps the list. The report
with the measured cases is `workshop:archive/research/kb-crowding-read-2026-11-02-p102.md`.

**Build.** Both of the two smallest fixes, each behind a constant in that one function, measured side by side:
(a) only the first N word hits count as hits in the blend (try 5); (b) a missed note gets a fixed place (try 4). Do not
change the function's arguments (`tests/test_seam_contracts.py`, about line 36, pins them), and do not make the change
at the call site: the search test calls the blend itself (`scripts/kb/eval_kb_embed_models.py`, about line 562) and
would not see it.

**It lands only if, on the search test before and after:** no held-back question loses its right note from the first
three (list every question that moved, both ways); the thirty meaning-only questions do better than 23; the crowded-out
questions in plan 102's report get their note back (list them); a note that matches the question's own words exactly
and came first still comes first; and `python scripts/measure_kb_thin_match.py` with its line gate shows the "No close
match" line on no question it did not show on before. Report one table per variant. The session picks with the second
opinion; you then leave one variant in and delete the other.

**Tests:** new cases in `tests/test_knowledge_base_service.py` with a ten-long word list (the existing blend tests use
five notes or fewer, so they should not move): a note found only by meaning outranks a ninth-place stray-word hit; an
exact first-place word match stays first. **Files owned:** that function and its constants, the new tests. **The Deck
check (P103-CROWDING-01, block D1):** with the session's library installed, two of the crowded-out questions, asked by
the game's name with nothing running, attach their right note.

## R2 — The prompt lane (★★★ `[KB]`, Sonnet high). You alone edit the prompt file this session.

Three pieces, in this order, each its own commit or commits.

**Piece 1, small: the "Looks like" label.** `py_modules/backend/prompts/ollama_prompts.py`, `_STRUCTURED_CARD_LABELS`
(line 266; used at about 588 to 594 to keep a note's labels as light bullets in the reply). Add `Looks like:`. The nine
saved prompt fingerprints (`tests/fixtures/spoiler_default_tier_golden.json`) must not move; say so in the report.

**Piece 2, small: the finale rule for versus notes** (plan 17, task OV-1.3). When a note of kind versus, coop, callout,
survival or realism is attached, one sentence: do not volunteer a campaign finale's tactics or layout; if the player
asks before they are there, help with the problem at hand first and say the finale can wait. The same rule, in plain
words, goes into `docs/planning/spoiler-constitution.md`. No such note exists until lane V2 lands, so test it with a
made-up attached note of that kind. Ordinary turns stay byte for byte the same.

**Piece 3: the honest "I don't know".**
*What a player sees today.* Ask about a boss the notes do not have, and the AI answers as if it knew: on eight
unanswerable questions it admitted not knowing in 3 and 4 of 24 replies, every one of them the back end's own footer
line, none in the AI's words.
*Where it comes from.* The footer is decided after the AI has written (`py_modules/backend/knowledge/
kb_notes_footers.py`, `append_kb_notes_footers`, called from `py_modules/backend/ask/game_ai_request.py` at about line
1011), but everything it is decided from is known before the AI is asked (the coverage facts at about line 481, the
transparency facts at 665 to 677, the attached notes at 713 to 722, the courtesy flag at 521; `ask_ollama` is called
at about 863). The AI's instructions carry no sign of it: with a note attached they say "Ground answers in the
attached strategy/compat cards when relevant" (`ollama_prompts.py`, about 570 to 579), even when the note is a stretch.
Know one trap: when nothing matches, a genre card is attached anyway (`knowledge_base_service.py`, about 1228 to 1232),
so "Not in my notes" almost never shows and the "No close match" line carries most of the cases. Your flag must be
true for both.
*Build.* Work out, before the call, whether either line will show, with the same two functions the footer uses
(`should_show_not_in_notes_notice`, `should_show_no_close_match_notice_for_turn`). Pass it to the prompt as **one new
named argument that can carry more than one fact** (this turn's flags: "the notes do not cover this" and piece 2's
"versus notes attached"), through `ask_ollama` (`main.py`, about 2176), `ollama_ask_service.py` (about 120 and 195),
`_build_system_prompt` (`main.py`, about 2114 to 2174) and `build_system_prompt` (`ollama_prompts.py`, line 375). Add
one sentence near the early block (about 565 to 594) only when the flag is set. Stand-ins that take only named
arguments will break and need the new one: `tests/test_game_ai_request_courtesy_reply.py` (about 89),
`tests/test_game_ai_request_strategy_followup_prompt.py` (56), `tests/test_ollama_ask_service.py` (68, 105),
`tests/test_ollama_service.py`; the argument pins are in `tests/test_seam_contracts.py` (about 68).
*Measure three wordings* with the answer test once lane T2 has landed (the session says when): on the eight
unanswerable questions, how often the AI says so **in its own words**; on the ordinary first-turn questions, facts kept
and contradictions; two runs each. Count the characters each wording adds.
*The landing rule (plan 103 § 2, call 11):* switched on only if the AI says so in its own words in at least half of
the tries and the ordinary answers stay inside the noise band lane X0 measured. Otherwise the code lands switched off
and the report gives the three tables.

**Files owned:** `py_modules/backend/prompts/ollama_prompts.py`, `main.py` (the prompt builder and `ask_ollama`'s
arguments only), `py_modules/backend/ask/ollama_ask_service.py`, `py_modules/backend/ask/game_ai_request.py`,
`docs/planning/spoiler-constitution.md`, the tests named above and one new prompt test. **The test at the Deck's
level:** with the flag set, the instructions contain the sentence; with it clear, every saved fingerprint is unchanged.
**The Deck check (P103-HONEST-01, block D1):** nothing running, Strategy: a made-up Hollow Knight boss: the reply's
first sentence says the notes do not cover it, and the "No close match" line shows under it; a real boss question
carries no such sentence; two wordings of each.

## C1 — Suggestion chips ordered by your last question (★★★ `[KB]`, Sonnet high; only when the session has a free slot)

**What a player sees today.** After an answer, the game's suggestion chips turn over in a fixed rotation that knows
nothing about what was just asked. This is the half of Phase 5 that was never built (`docs/knowledge-base.md`, the
Phase 5 table, "Chip ranking").

**Build.** In `py_modules/backend/knowledge/knowledge_base_chips.py`: after an Ask, order the game's own chips by how
close each note is to the last question, using the meaning vectors the library already holds and the question's own
vector if the search already computed it (no new call to a model; if no vector is at hand, today's order stays). A cold
open keeps today's order. Everything the chip rows already promise must hold, with its existing tests green: at least
one of the game's own chips shows, game chips come before shared tips, the Tip badge, and no chip is favoured for ever
(the rotation fix from plan 78). Lane V1 lands in this file first; you are cut after it.

**Measure on this PC:** for thirty questions across six games, the first three chips before and after, and a plain
count of how many are about the question's subject. **Files owned:** the chips file and its tests. **The Deck check
(P103-CHIP-ORDER-01, block D3):** after a boss question in a game, at least one of the first three chips names
something from the same fight or area; the game's own chip still shows; two games.

---

## V1 — Groundwork for versus notes (★★ `[KB]`, Sonnet high)

**What this is.** Plan 17's first stage, with today's file paths (the plan's own are stale, and so is its "not
started" table: update both in `docs/planning/17-kb-online-versus-strategy-content.md`).

**Build.**
1. Five new note kinds: `versus`, `coop`, `callout`, `survival`, `realism`. List every kind the library uses, old and
   new, in `docs/knowledge-base.md` (it has no such list today).
2. `py_modules/backend/spoilers/spoiler_risk_service.py`: the low-risk list (line 63; today tip, compat, control,
   mechanic, starting_out) gains the five. One test in `tests/test_spoiler_risk_service.py` per direction.
3. `py_modules/backend/knowledge/knowledge_base_chips.py`, the chip wording (about lines 190 to 210): an unknown kind
   falls through to "What should I know about X?". Give the five their own short wording (read plan 17, task OV-1.4,
   for the intent) and pin it with a test.
4. `py_modules/backend/knowledge/knowledge_base_search.py`, the kind words (about lines 253 to 297): add the words a
   player uses for these kinds only if the eighteen existing Left 4 Dead 2 versus questions need them; measure with
   the search test before and after on those rows and report.

Not yours: the finale rule (lane R2), the notes (lane V2). **Files owned:** the three back-end files above and their
tests, `docs/knowledge-base.md`, plan 17's file. **The test at the Deck's level:** a chip built from a note of kind
versus reads as your new wording. **The Deck check:** part of P103-VERSUS-01 (lane V2).

## V2 — Left 4 Dead 2 versus notes (★★★ `[KB]`, Sonnet high; after V1 lands)

**What a player sees today.** "Where are the death charge spots" or "how do we counter a Boomer and Smoker together"
gets the AI's memory. Eight of the eighteen versus questions in the search test find nothing. The seven "Playing as
the Tank, Hunter, Jockey, Smoker, Charger, Boomer, Spitter" notes exist, filed as game mechanics.

**Build.**
1. **The seed, seven fields only:** in `data/kb/strategy_seed.json`, those seven notes' `section_type` becomes
   `versus`. Their names and text do not change (test questions point at them by name). One commit. Before and after:
   the search test on the 29 Left 4 Dead 2 questions (no labelled question loses its note) and the number of chips the
   chips function returns for the game (it must not drop).
2. **A new file,** `data/kb/notes/left-4-dead-2-versus.json`, numbers 4500 to 4599, `game_id` 3: ten to fifteen notes
   of the new kinds, from the Left 4 Dead wiki (`https://left4dead.fandom.com/api.php`; confirm the path and the
   licence with the reader) under the note rules in the rules page. Subjects: the session hands you the subjects of the
   eight unanswered questions (their subjects, never their wording); beyond those, playing the survivors against each
   special infected in versus, team combinations, callouts kept as brief as the page allows for one or two campaigns,
   survival mode, realism mode. **No finale content in any note** (plan 17's rule).

**Files owned:** the seven fields, your new file and its sources list. **The Deck check (P103-VERSUS-01, block D1 or
D3):** nothing running, "Left 4 Dead 2 versus" in the question: two questions on your subjects attach a note from your
file, and the chip under the answer reads as a versus chip.

## G1 — Mod basics tips (★★★ entry, its first step; Sonnet high)

Your brief is section **G** of [101-lane-briefs.md](101-lane-briefs.md) (about lines 161 to 173), word for word; the
plan it comes from is [plan 101](../101-deep-mod-ai-hints.md) (§ 7d has the rule of thumb for mods and online play).
Plan 103's rules page applies. Changes for this session: the tips file holds 167 tips today, so yours start at 168;
the rows are P103-MODS-TIPS-01 instead of plan 101's; you write no test questions (lane Q6 writes them from your tips'
names). Every tip is in your own words, marked "Researched, unconfirmed", and under the tips' length limit (a test
caps a tip at 200 characters). Never a step that deletes a prefix or a save without a backup step first. The licence
reviewer reads the tips before they land. **The Deck check (P103-MODS-TIPS-01, block D1):** nothing running, "how do I
set up mods for Skyrim on my Deck": a tip from the new topic attaches.

---

## S1 — Covers and the notes line (★, ★ and a new ★★ `[KB]` `[ui]`, Sonnet high). You are the first lane in the transcript file.

**Piece 1: a no-story game named in the question.**
*What a player sees.* With nothing running, a Brotato question drew a cover under Default and the cover stayed shut. A
game with no story should have its covers open by themselves.
*Where it comes from.* The rule is `noStoryRuleOpensEverything` (`src/features/spoilers/unwrapAskedEntitySpoilerFences.ts`,
about lines 127 to 130), which asks `turnProfileIsLowNarrative` (`src/features/spoilers/spoilerTitleProfiles.ts`, about
194 to 200). It is given the running game's id and name only (`src/features/answer/transcript/MainTabChatTranscript.tsx`,
about lines 500 and 520 to 524). With nothing running both are empty. And Brotato is in the id list
(`LOW_NARRATIVE_APP_IDS`, line 42) but in neither name list (`LOW_NARRATIVE_TITLES`, line 77; `_LOW_NARRATIVE_TITLES` in
`py_modules/backend/spoilers/spoiler_title_profiles.py`), so the back end could not match a typed name either.
*Build.* (a) Every game on the id list has its name on the name lists, both languages, and the shared contract file
`tests/contracts/spoiler-title-profiles.json`; a test fails when an id-list game has no name entry. (b) The screen
learns which game the back end worked out for the turn: look first for something the screen already receives (the
attached notes, the transparency facts). **If nothing carries it, stop and report:** the reply payload is built in a
file lane R2 owns until it lands, and a follow-up is cut after. (c) `src/features/answer/` copy text
(`answerCopyText.ts`) follows the same rule. Block D0b's reading (row P103-M-BROTATO) tells you whether the back end
already gave the relaxed wording.

**Piece 2: a covered answer says notes were used** (plan 103 § 2, call 14).
*Where it comes from.* `src/features/knowledge-library/buildKbNotesBlockElement.tsx`: `kbNotesBlockedBySpoiler` (about
lines 196 to 204) returns no notes while the answer holds a shut cover, on purpose (the comment at about 232 says the
block is delayed, not removed). Block D0b's reading (P103-M-COVERED-NOTES) confirms the line appears once the cover is
opened.
*Build.* While blocked, draw one caption line with neutral words and no note names (the same file already has neutral
titles for protected notes, `kbNoteNeutralTitle`, about line 103; match its tone). It is not a D-pad stop. When the
cover is opened the real notes line replaces it.

**Piece 3 (found while planning): one open cover shows every answer's notes.**
`kbNotesBlockedBySpoiler` ends in `anySpoilerFenceOpen()` (line 203; from
`src/features/answer/markdown/MainTabBonsaiAiMarkdownChunk.tsx`), one switch for the whole page. Opening a cover on
one answer lifts the wait under every answer. **Write the failing test first** (two answers, both covered; open one;
the other's notes stay hidden); if the test passes as the code stands, the reading was wrong: say so and drop the
piece. Otherwise ask per answer.

**Files owned:** the notes line builder, the markdown chunk file's switch, the two profile files and the contract
file, the cover rule file, the copy text file, three call sites in the transcript file (about lines 500 to 536, 1308,
1344), and the tests (`MainTabChatTranscript.spoilerCredits.test.tsx`, `.kbNotesBlock.test.tsx`, the profile tests in
both languages). **The Deck checks (block D1):** P103-BROTATO-01 (nothing running, Default, a Brotato question that
draws a cover: it is open; two wordings); P103-COVERED-NOTES-01 (a fully covered answer shows the caption; after A on
the cover, the notes line); P103-COVER-PER-TURN-01 (two covered answers; open one; the other still shows only its
caption). A spoiler fix is not believed until the Deck shows the cover.

## F1 — The answer screen's D-pad (three ★★ `[focus]` entries, Opus extra-high; cut after S1 lands, with block D0b's measurements in your task)

**Part 1: the Copy icon and a checklist.**
*Seen on the Deck 2026-11-03, three times* (`workshop:test-evidence/plan102-P98-ROUTE-01-try3.json`): Up from a
checklist's step 1 lands on the Copy icon, and Down from the Copy icon skips the whole list and lands on "Mark reply
helpful".
*Read in the code.* Down: `downOutOfCorner` (`src/features/answer/bubble/buildAnswerCornerSlots.tsx`, line 82) tries the
summed-up note, Helpful, the reason chips, the note card and Show details, and never the strategy choice buttons or the
checklist steps; `focusStrategyChromeFromAbove` (`src/shared/dpad/liveTurnFocusGraph.ts`) already does that job. Up: the
transcript passes handlers that always decline (`MainTabChatTranscript.tsx`, about lines 1044 to 1045), so Up from step
1 is Steam's own choice, and the Copy icon sits just above the list. Down from the answer's last paragraph goes straight
to step 1 (`focusDownFromLiveAnswerBubble`, about line 352).
*Build.* Down from the Copy icon reaches the choice buttons or step 1 when they are drawn. Up from step 1 mirrors Down:
the last choice button, else the summed-up note, else the answer's last paragraph. Block D0b's reading
(P103-M-CHECKLIST) says what Steam does when choice buttons and a list are both on screen.

**Part 2: the Show details strip and the chip ladder.** Two roadmap entries, one cause.
*Seen:* with the panel's page out of focus, Down from the notes line skips the open details panel and lands on the
suggestion chips (in tests, plan 102 lane C); on some chats Down from "Hide details" jumps into the chip ladder and the
"This answer / Session" strip cannot be reached though it is on screen (`workshop:test-evidence/
plan99-FILMING-SIGHTINGS.md`, section 1).
*Read in the code.* The strip is a bare Focusable (`src/features/answer/details/buildDetailsPanelElement.tsx`, about
line 265), known to the plugin by its element only, with no Steam stop of its own; the ladder's root
(`src/features/answer/details/ContextChipLadder.tsx`, about lines 331 to 336) the same, and its chips are plain hops.
With the page out of focus both hops report "did not land" (`src/shared/dpad/focusPerTurnRow.ts`, `focusRowElement`),
the chain falls through to `focusDownFromReplyUtilityRowOrPermHint` (`src/shared/dpad/chatTranscriptNavHelpers.ts`,
about line 59), and its last step, the suggestion chips, does have a stop. The notes line is the model: it registers
its own stop with `registerRowNav` (`buildKbNotesBlockElement.tsx`, about lines 266 to 284 and 345 to 352).
*Not settled by reading; block D0b measures them (P103-M-DETAILS-STRIP):* whether the page had really lost focus on the
chats where the strip could not be reached; whether the `tabindex` of -1 that `focusRowElement` leaves on a row takes
the strip out of Steam's own moves; whether a stop on the ladder's root still works once the ladder moves the ring to
a chip with a plain hop. The strip is drawn only under the newest answer (`MainTabChatTranscript.tsx`, about lines 1262
and 1390).
*Build.* The strip and the ladder's root each get their own Steam stop, the notes line's way. The chains are at
`MainTabChatTranscript.tsx`, about lines 919, 1338 to 1355 and 1541 to 1575, and `downFromDivider` in
`src/features/answer/reply-actions/buildReplyActionsElement.tsx` (about 468).

**Tests, for both parts:** walks with Steam's scroll modelled, each also with the page reporting no focus (the
`*.lostFocus.test.tsx` files are the pattern), bounded, no stop twice, and every new stop hears A and B. **Also, report
only:** if you meet a Decky button whose own move handler sends the ring somewhere other than the control nearest to it
on screen, name it; an open roadmap question needs exactly one such button to settle on the Deck.

**Files owned:** the corner slots file, `liveTurnFocusGraph.ts`, the details panel file, the chip ladder file,
`focusPerTurnRow.ts`, `chatTranscriptNavHelpers.ts`, the reply actions file, the transcript file, their tests. The
second opinion reads your change before it lands. **The Deck checks (block D2):** P103-CHECKLIST-COPY-01 (Down from the
Copy icon lands on step 1; Up from step 1 does not land on the Copy icon; the steps walk; three times);
P103-DETAILS-STRIP-01 (on a four-turn and an eight-turn chat, with and without a game: Down from "Hide details" lands on
the strip; Right reaches Session; three tries each); P102-UNDO-FOCUS-01 (its fourth Down lands on the strip).

## F2 — The starter-models box fits the Deck's screen (★★ `[ui]` `[first-run]`, Opus extra-high)

**What a player sees.** On a fresh install, after Install Ollama, the starter-models box is taller than the Deck's
screen: its title and the line saying where Ollama downloads from sit above the top edge and Up does not bring them
back. The README promises that line. Evidence with two pictures: `workshop:test-evidence/readme-STARTER-BOX-TOO-TALL.md`.

**Where it comes from.** The shared two-button box (`src/shared/TwoButtonConfirmModal.tsx`, line 113) has no height
limit and does not scroll. Its body here is `starterSetBoxBody` (`src/features/models/localOllamaStarterSet.tsx`, about
line 44) stacked with the download notice's lines and the "Internet downloads are off" paragraph
(`src/features/downloads/downloadNotice.tsx`, about line 222).

**Build.** The title and the "where it downloads from" line are always on screen when the box opens. The body gets a
height it cannot exceed and scrolls inside it; **no height written as a share of the screen** (the Deck's own screen and
an external monitor differ; use the design tokens' fixed sizes, `docs/design-tokens.md`). The ring starts on Cancel as
today; Up from the buttons scrolls the body rather than doing nothing. Every other box that uses the shared box keeps
its look: list them (search for the component's name) and say which you checked. State the fit as arithmetic in a test
that reads the numbers back out of the stylesheet (jsdom has no layout).

**Files owned:** the shared box, the starter set's body, the download notice, their tests. **The Deck check
(P103-STARTER-BOX-01):** needs a fresh-install state, so it is a look on the PC stand-in in block D2 and a row on the
maintainer's checks page for the Deck (plan 103 § 2, call 16).

## B1 — Two small fixes (★ and ★, Sonnet medium), one commit each

1. **Log noise with the mic off.** The log shows "voice: stop pressed, no recording was running" (six times in one
   clean-install run) though no recording was started. The line is at `py_modules/backend/voice/voice_rpc.py`, about
   246. Two places on the screen ask for a stop with no recording: `src/features/voice/useVoiceAskInput.ts` (about 213,
   `endDictation`) and `src/features/voice/useVoiceTranscription.ts` (about 217, the poll-error path). Guard the two
   callers; the back end's line drops to debug level. A test per caller. **Row P103-MIC-LOG-01 (block D1):** the mic
   off, six A presses on the Main tab, the log holds none of those lines.
2. **The quick-start box.** "Using bonsAI" opens with entering a home PC's address and "every ask will fail", and never
   mentions the Install Ollama button on the Deck itself. The text is
   `src/features/about/pluginQuickStartInstructions.tsx`, about lines 44 to 55, shown by `PluginHelpModal.tsx`. Lead
   with running the AI on this Deck (Install Ollama, on the Ollama tab), then the home PC as the second way. Short,
   plain sentences. Search for the old words everywhere first (a mock-up board copy or a test may pin them). **Row
   P103-QUICKSTART-01 (block D1):** the box reads as written, by a screenshot for the maintainer's eye.

**Files owned:** the three voice files and their tests; the quick-start text and whatever pins its words.

## B2 — The chat summing-up that gave up (★ `[chat]`, Sonnet high; one hour)

**What a player sees.** In a chat of forty-odd questions, "Couldn't sum up the chat this time, so this answer only
knows the newest turns" showed before an answer, after about 68 seconds. The answer itself was fine.

**Where it comes from.** `py_modules/backend/chats/chat_summary_service.py`: the time limit is 120 seconds (line 88),
so 68 was not the limit; a timeout and a failure show the same line (about 523, and
`buildChatSummaryNoteElement.tsx`, about 44). The service logs "failed in X s" with its error. Block D0b brings you
that log line from the Deck (row P103-M-SUMUP).

**Build.** If the log names a cause you can fix in the summary files (a model being swapped out mid-call, a prompt too
long for the window, a reply that does not parse), fix it with a test that fails without the fix. If it does not, make
the failure say why in the log and on the line the player reads ("the AI ran out of room", "the AI stopped answering"),
and stop there. **Files owned:** `py_modules/backend/chats/chat_summary_service.py`, `chat_memory_step.py`, the note
element, their tests. **Row P103-SUMUP-01 (block D1), only if a cause was fixed:** one question in the long test chat
sums up, or says why not.

---

## P1 — A labelled picture set (★★ `[KB]` `[QA]`, Sonnet high)

**What is wrong today.** The picture test has 11 pictures (`tests/fixtures/screenshot_eval_v0.json`), most of them
title screens, none with a boss, so no number about bosses or places means much.

**What you have.** The session copied the screenshots already on the Deck into
`C:\Users\still\Documents\bonsAI-workshop\screenshots\plan103-steam\<app id>\`. Steam files them by game, so the folder
is the game (the session's task text carries the list of app ids and names). You can open a picture and look at it.

**Build.** Pick 40 to 60 pictures: ten games or more, library games first; at least ten with a boss or a named enemy
on screen; at least five from games the library does not hold; a mix of title, menu, play and pause. **Rule 20 of the
rules page:** game screens only. For each, make the copy the AI will see (longest side 800, JPEG quality 62: the
plugin's default, `py_modules/backend/media/screenshot_media.py`, about lines 798 to 845) in
`screenshots\plan103-set\`, and write its labels: game and other names for it, scene, place, boss or enemy and other
names for it, and, where the library has a note for what is on screen, that note's name (`expect_section`; read the
note names with a small script, not by opening notes one by one). Say how sure you are of each label. The new labels
file is `tests/fixtures/screenshot_eval_v1.json`, in v0's shape plus the new fields; v0 stays. The ten labels you are
least sure of go into `workshop:checks/plan103-picture-labels.md` with the picture's file name beside each, for the
maintainer.

**Files owned:** the new labels file; the two workshop folders. **The test at the Deck's level:** a small test that the
labels file loads and every `expect_section` names a note that exists.

## P2 — The picture's own guess joins the note search (★★★ `[KB]`, Sonnet high; after P1)

**What a player sees today.** Attach a boss picture, ask "how do I beat this": the notes are searched for "how do I
beat this". The search runs before the AI ever sees the picture and uses the typed words and the running game only
(`py_modules/backend/ask/game_ai_request.py`: the search at about lines 509 to 619, the AI call at about 863; nothing
in `knowledge_base_service.py` handles a picture).

**Build, in two rounds.**
*Round 1, no shared file:* a new module, `py_modules/backend/ask/picture_guess.py`: a short question to the picture
model ("Name the game, the place, and any boss or enemy you can see. Three short lines. Write 'not sure' where you are
not.") and a reader that turns its reply into search words, dropping every "not sure". The pattern for a short first
call is the chat summing-up (`py_modules/backend/chats/chat_memory_step.py`, about lines 48 to 119, and
`chat_summary_service.py` through `_stream_ollama_chat_once`); a Stop in the middle must stop the whole ask, as there.
The words join the search the way a follow-up's earlier subject already does (`kb_followup_memory.augment_search_words`,
`game_ai_request.py`, about line 573). In `scripts/kb/eval_screenshot_reading.py`, add a way to measure, on P1's
pictures that carry an `expect_section`: with today's search, and with the guess's words added, how often the right
note is among those attached, and the seconds the first call added; for the Deck's starter model and for `qwen3.5:4b`.
(An older note in `docs/knowledge-base.md`, about lines 396 to 398, wanted no extra call, reading the guess out of the
answer itself. That cannot help the answer, which is written before the search could use it; say so in the doc with a
dated line, and measure the extra call honestly.)
*Round 2, after lane R2 has landed (the session says when):* the one call site in `game_ai_request.py`, between the
"should we search" check and the search. Today the model is chosen inside `ask_ollama`, after the search; report the
smallest change that lets the first call know its model, and **if it needs more than the call site and your own module,
stop and report**. The switch is a constant in your module.

**The landing rule (plan 103 § 2, call 10):** on only for Strategy, a picture attached and the library on, and only if
the right note is found at least twice as often and the first call adds under ten seconds on this PC. Otherwise it
lands switched off. **Files owned:** your new module and its tests, the picture scoring script and its tests, the three
doc rows; then the one call site. **The Deck check (P103-PICTURE-SEARCH-01, block D2 or D3), only if it lands on:** a
placed boss picture from a library game, "how do I beat this": the notes line names that boss's note; the driver
records the seconds from send to first word against a picture question with the switch's gate not met (Speed mode).

## P3 — Can the Deck's AI mark a boss picture (★★★ `[KB]`, Sonnet high builds; an Opus helper grades)

**What this decides.** The mock-up board's second visual-map shape is "your screenshot, marked": up to three numbered
marks (hit, avoid, dodge), each saying whether the AI is sure, an unsure mark dashed. Its own note says: before any
build, a stronger model grades the small models' marks out of ten. Nothing is drawn in the plugin by this lane.

**Build.** A new script, `scripts/kb/eval_screenshot_marks.py`: for each boss picture in P1's set and each picture
model the Deck offers that this PC holds (`gemma4:e2b-it-qat`, `qwen2.5vl:3b`, `qwen3.5:4b`, `llava:7b`): ask for up to
three marks, each one line: the kind (hit, avoid or dodge), where (left-to-right and top-to-bottom as two numbers from
0 to 1), three words, and sure or not sure. Read the reply strictly; a line that does not parse is counted, not
guessed. Draw the marks on a copy of the picture the way the board draws them (hit green, avoid red, dodge amber,
numbered, dashed when unsure; a 260 by 140 preview and the full size) into
`workshop:screenshots\plan103-marks\<model>\`, and write one grading sheet per model listing each picture, the boss, the
note's own advice for it, and the marks as words. **The grader** (the session starts it; not you) opens each marked
picture and scores it 0 to 10: is each mark on the thing it names; is the advice right for this boss by its note; a
confident wrong mark costs more than an honest "not sure"; no marks at all on a picture with a clear boss scores low,
not zero. Your report then gives, per model: the mean, the share at 7 or more, the share with any confident wrong mark,
and how many replies did not parse.

**The bar (plan 103 § 2, call 12):** the marked screenshot is built only if the best model averages 7 or more on at
least 15 boss pictures. **Files owned:** the new script and its tests (the reader, the drawing's arithmetic). **The
test at the Deck's level:** none; the grades are the result.

## P4 — The marked screenshot in the reply (★★★ `[KB]` ui, Opus extra-high; written by the session only if P3 clears the bar)

The brief is written then, from P3's numbers and the mock-up board's drawing (`docs/demos/mockup-board/`, tab 5; the
drawing's own source gives 260 by 140, three marks at most, Left and Right stepping through them, "not sure" dashed).
What is fixed now: answers draw no pictures today, on purpose (an image in a reply is turned into text,
`MainTabBonsaiAiMarkdownChunk.tsx`, about lines 258 to 265, since the 0.6.0 security review), so the picture must come
from the back end by a new method that hands over only the picture the player attached to that turn, never a path the
reply names; the marks are placed on the picture as it was sent to the AI (800 pixels on the long side by default); the
security reviewer and the second opinion read it before it lands; its Deck row is P103-MARKED-01.

---

## N13 to N35 — Enemy and item notes for 23 games (★★★★ `[KB]`, Sonnet high, one lane per game)

**What a player sees today.** "How do I deal with the uncommon infected" or "what does the Mushroom Shop sell" gets the
AI's memory in these 23 games: none of them has an enemy or item note in the labelled short-line shape, and ten have
two such notes or fewer of any shape.

**Where it comes from.** The library builder reads every `*.json` under `data/kb/notes/` after the seed: an object with
`games`, `aliases` and `sections` lists. A section has `section_id`, `game_id`, `section_type`, `name`, `card`,
`source_url`, `source_license`, `source_version`, `crawled_at`. The labelled shape (the models are plan 102's files,
for example `data/kb/notes/doom-64.json` and its `.sources.json`): `Summary:` one line; `Weak points:` (an enemy or a
boss) or `Uses:` (an item) one line; `Looks like:` one line where the page describes the look (rule 14, new);
`Tips:` one or two lines; each line a plain sentence.

**Your game, its source and its numbers.** Every file holds an empty `games` list and an empty `aliases` list.
Confirm the api path with `--search` and read the licence the reader prints before any page; write the licence in the
versioned form the library already carries for that wiki.

| Lane | Game | `game_id` | Source as its notes cite it | File under `data/kb/notes/` | Numbers |
|---|---|---|---|---|---|
| N13 | Left 4 Dead 2 | 3 | left4dead.fandom.com, CC-BY-SA-3.0 | `left-4-dead-2.json` | 2200 to 2299 |
| N14 | Fallout 4 | 5 | fallout.fandom.com, CC-BY-SA-3.0 | `fallout-4.json` | 2300 to 2399 |
| N15 | Red Dead Redemption 2 | 11 | none cited today: see below | `red-dead-redemption-2.json` | 2400 to 2499 |
| N16 | Hades | 7 | none cited today: see below | `hades.json` | 2500 to 2599 |
| N17 | Half-Life 2 | 13 | combineoverwiki.net, CC-BY-SA-4.0 | `half-life-2.json` | 2600 to 2699 |
| N18 | Cyberpunk 2077 | 8 | cyberpunk.fandom.com, CC-BY-SA-3.0 | `cyberpunk-2077.json` | 2700 to 2799 |
| N19 | Mario Party | 26 | www.mariowiki.com, CC-BY-SA-4.0 | `mario-party.json` | 2800 to 2899 |
| N20 | Mario Party 2 | 27 | www.mariowiki.com | `mario-party-2.json` | 2900 to 2999 |
| N21 | Mario Party 3 | 28 | www.mariowiki.com | `mario-party-3.json` | 3000 to 3099 |
| N22 | Mario Party 6 | 29 | www.mariowiki.com | `mario-party-6.json` | 3100 to 3199 |
| N23 | Mario Party 7 | 30 | www.mariowiki.com | `mario-party-7.json` | 3200 to 3299 |
| N24 | Super Smash Bros. | 34 | www.ssbwiki.com, CC-BY-SA-4.0 | `super-smash-bros.json` | 3300 to 3399 |
| N25 | Super Smash Bros. Melee | 25 | www.ssbwiki.com | `super-smash-bros-melee.json` | 3400 to 3499 |
| N26 | Grand Theft Auto III | 35 | gta.fandom.com, CC-BY-SA-3.0 | `grand-theft-auto-iii.json` | 3500 to 3599 |
| N27 | Yoshi's Story | 32 | www.mariowiki.com | `yoshis-story.json` | 3600 to 3699 |
| N28 | Diddy Kong Racing | 33 | www.mariowiki.com | `diddy-kong-racing.json` | 3700 to 3799 |
| N29 | Fallout: New Vegas | 20 | fallout.fandom.com, CC-BY-SA-3.0 | `fallout-new-vegas.json` | 3800 to 3899 |
| N30 | Brotato | 36 | brotato.wiki.spellsandguns.com, CC-BY-SA-4.0 | `brotato.json` | 3900 to 3999 |
| N31 | Palworld | 37 | palworld.wiki.gg, CC-BY-SA-4.0 | `palworld.json` | 4000 to 4099 |
| N32 | Skyrim Special Edition | 38 | en.uesp.net, CC-BY-SA-2.5 | `skyrim-special-edition.json` | 4100 to 4199 |
| N33 | Hollow Knight | 15 | hollowknight.wiki, CC-BY-SA-3.0 | `hollow-knight.json` | 4200 to 4299 |
| N34 | Black Mesa | 14 | combineoverwiki.net, CC-BY-SA-4.0 | `black-mesa.json` | 4300 to 4399 |
| N35 | DOOM Eternal | 16 | doomwiki.org (its api is under `/w/`), CC-BY-SA-4.0 | `doom-eternal.json` | 4400 to 4499 |

**Hades and Red Dead Redemption 2 (N15, N16).** Their notes today are the maintainer's own words with no page behind
them, so no wiki is cleared for them yet. Your first act: point the reader's `--search` at the game's own wiki
(`https://hades.fandom.com/api.php`, `https://reddead.fandom.com/api.php`) and read the licence it prints. If it is a
licence the library accepts (CC BY, CC BY-SA), use that wiki. If it is NonCommercial, GFDL or missing, try English
Wikipedia (`https://en.wikipedia.org/w/api.php`, CC BY-SA 4.0), as Baldur's Gate 3's notes did. If neither gives you
pages to stand on, **stop and report**: the game gets no new notes this session.

**Subjects.** Ten to fifteen notes: the enemies a player asks "how do I deal with" and the items a player asks "what
does this do" or "where do I get". **Add, never repeat:** the appendix at the end of this file lists what your game
already has; read those notes first (in the seed, by `game_id`) and write none of their subjects again. For the party
and fighting games (N19 to N25) "enemy" means what acts against the player on a board or a stage (hazards, a boss, the
characters that take coins or stars), "item" means items, orbs and capsules; write fewer notes if the wiki runs out,
and report the shortfall rather than fill it from memory. Rule 13 (no story given away in a name or a Summary) holds
for every game; for Hades, Red Dead Redemption 2, Cyberpunk 2077, Fallout 4, Fallout: New Vegas, Half-Life 2, Black
Mesa, Hollow Knight and Skyrim read it twice.

**Build (content only, one commit per three to five notes).** `source_url` the page read, `source_license` as above,
`source_version` the revision id, `crawled_at` today. The sources list `<file>.sources.json` gives, per `section_id`,
the page, the revision and the sentence or table row each line was drawn from, with the licence header (copy
`data/kb/notes/doom-64.sources.json`'s shape). Keep the fetched pages in `build/wiki-live/<wiki>/` in your copy: the
checker reads them. Read every sentence against its page before you report, line by line, and say so.

**Files owned:** your file and its sources list only. A schema check script of your own in `.scratch/` (fields present,
numbers in range, game id right, no repeats within your file, every section labelled) and one library build in your
copy (`python scripts/kb/build_rag_db.py --seed --out .scratch/kb`).

**Your report** lists every note's name, kind and page; the list of names only (bracketed parts kept) for the question
lane; and anything in the game's older notes that the wiki contradicts (for lane M; do not fix it). **Nothing lands
before the checker and the licence reviewer have read your file.** The session lands files in batches of up to six.

**The Deck check (P103-NOTES-23-01, block D3):** with the session's library installed and nothing running, one enemy or
item question per game, by the game's name, attaches a note from the new file; the row passes on 20 of 23 or more and
names the misses.

## Q3, Q4, Q5 — Blind test questions for the new notes (★★ `[KB]`, Sonnet medium; one helper per batch; after T1 lands)

**What this is.** Whoever writes a note never writes its test question. From the note lanes, through the session, you
get the new notes as names, kinds and numbers only, never their text, bracketed parts kept. Write two questions per
note the way a player types them (one plain, one terse or misspelled). **One new file per game** in
`tests/fixtures/kb_eval/` (`p103-<game>.json`, an object with a `queries` list), never the main file. Each row: id
`V2-P103-<GAME>-<NN>` (use the short game code that game's existing rows already carry; read ids only), split
`holdout`, domain `strategy`, the game's `app_id` or, for a game with no Steam id, the `shortcut` name as its existing
rows carry it, `query`, `intent`, `topic_hint` empty, `withheld_card_terms` empty, `skill_level`, `input_style`, `note`
"Written blind <today> from the note's name only", `expect_section` the note's name. Do not open the notes files or
their sources lists. The label test checks every row names a note that exists, so your rows are written after their
notes file has landed (the session says when). **Files owned:** your new files. **The test at the Deck's level:** none;
lanes X1 and X2 run the search test on your rows.

Q3: the six original titles (N13 to N18). Q4: the ten thinnest (N19 to N28). Q5: the last seven (N29 to N35).

## Q6 — The eight unanswered versus questions, and questions for the mod tips (★★ `[KB]`, Sonnet medium; after V2 and G1 land)

1. In `tests/fixtures/kb_eval_v2.json`, the eight Left 4 Dead 2 versus rows with an empty `expect_section` (among ids
   `V2-S-L4D2-12` to `-29`): for each, from the names and kinds of lane V2's new notes only (the session hands you the
   list), name the note that answers it, or leave it empty with a one-line reason in its `note` field. You did not write
   the notes and must not open them. You are the only helper that edits this file after lane T1 lands; touch only those
   eight rows.
2. One new file, `tests/fixtures/kb_eval/p103-mods.json`: two questions per mod tip, from the tips' names only (from
   lane G1's report), in the shape the existing tip questions use (domain and labels as the `SYM` rows carry them). If a
   test pins which tip questions are expected to miss (`tests/test_compat_topic_router.py`, about lines 296 to 360),
   your rows must pass by rule, as lane T1's report describes.

**Files owned:** those eight rows; the new file.

## CH1, CH2, CH3 — The checker (★★ `[KB]`, Sonnet high; one per batch; reads and reports, changes nothing)

For each notes file in your batch: read every sentence of every note against the quote its sources list gives and
against the fetched page itself (the lane's `build/wiki-live/` folder; fetch the same revision again if a page is
missing). Report, per file: every sentence that says more than its quote (an added detail, a number the page does not
give, another game's naming); every quote that is not on the page; every name or Summary that gives a story beat away;
every note whose subject the game's older notes already cover. The note lane fixes what you list and you read the fixes.
Then pick ten notes at random from the whole batch (say the seed you used) and write
`workshop:checks/plan103-sample-<batch>.md`: each of the ten in full, with the page it came from, for the maintainer's
read (plan 103 § 2, call 4). CH1 also writes `plan103-sample-earlier.md`: ten at random from the 125 notes plans 100
and 102 added (the twelve files already under `data/kb/notes/`).

## The licence reviewer (`foss-advocate`, Sonnet high; read-only)

Reads every new notes file with its sources list, lane V2's file and lane G1's tips before they land: is every source
one the library may use and credited as its licence asks; is any line close enough to the source's own wording, or to
a game's own text, to need a quote or a rewording; does anything in a mod tip send a player toward a risk without
saying so. One short report per three or four files: what blocks publishing, what should be fixed first, what is fine.

## The grader of the marks (a general helper, Opus high; read-only)

Opens each marked picture lane P3 wrote and its grading sheet, scores each picture 0 to 10 by P3's rubric, and writes
one line of reason per score into the sheet's copy `-graded`. It never sees which model made which folder until it has
finished: the session renames the folders A to D first.

---

## M — A correction or a bug found on the way (template)

One section per item, written by the session: what a player sees (from the evidence file or the note lane's report),
where it comes from (the file and line the session read), the one change to build, the files owned, the test at the
Deck's level, and the row (`P103-M<n>-<NAME>`). Sonnet high when the fix needs a judgment, Sonnet medium when the cause
is known and there is one obvious way; about an hour each; a bug that resists is written up and left open. Corrections
to older notes go to one helper at a time, because they share the seed file, and only after lane V2's seed commit has
landed.

---

## Appendix — What each of the 23 games already has (write none of these again)

Counted from the data at tip `3d86f5b7`. Enemy, item and boss notes first; then the game's other notes.

- **Left 4 Dead 2** (game 3): Tank (boss); The Witch (boss); Charger, Hunter, Smoker, Jockey, Boomer, Spitter (enemy);
  Bile bomb (item). Other: The Parish; The Director; Going down and black and white; Expert and Realism; Playing as the
  Tank, Hunter, Jockey, Smoker, Charger, Boomer, Spitter.
- **Fallout 4** (game 5): Deathclaw (boss); Mirelurk queen (boss); Feral ghouls (enemy); Legendary enemies (enemy);
  Stimpaks and chems (item). Other: Corvega Factory; Settlement happiness; Settlement defense and attacks; SPECIAL
  points; Perks; Power armor and fusion cores; Upgrading power armor; Crafting and junk; Choosing a build; Starting out.
- **Red Dead Redemption 2** (game 11): Bear (boss); Legendary animals (enemy); Tonics and provisions (item). Other:
  Valentine; Honor; Horse bonding; Cores and rings; Dead Eye; Perfect pelts; Bounties; Camp donations; Horse breeds;
  Satchel upgrades; Coming from GTA; Starting out.
- **Hades** (game 7): Megaera (boss); Theseus and Asterius (boss); Stygian Blade, Shield of Chaos, Heart-Seeking Bow,
  Eternal Spear, Twin Fists of Malphon, Adamant Rail (item). Other: Temple of Styx; Mirror of Night; Weapon aspects;
  Weapon choice; Darkness, keys and gems; Boons and duo boons; Heat and the Pact of Punishment.
- **Half-Life 2** (game 13): Strider (boss); Hunter-Chopper (boss); Antlions (enemy); Combine soldiers (enemy); Gravity
  Gun, Rocket-Propelled Grenade Launcher, Pheropod (item). Other: Ravenholm; Sandtraps.
- **Cyberpunk 2077** (game 8): Adam Smasher (boss); Cyberpsychos (enemy); Iconic weapons (item). Other: All Foods Plant;
  Sandevistan; Berserk; Kerenzikov; Street Cred; Lifepath; Ripperdocs; Quickhacks; Choosing a build; Starting out.
- **Mario Party** (game 26): The Mushroom Shop's turn-changing blocks (item); Eternal Star and the Baby Bowsers (boss).
  Other: Starting out; the six boards (DK's Jungle Adventure, Peach's Birthday Cake, Wario's Battle Canyon, Luigi's
  Engine Room, Mario's Rainbow Castle, Bowser's Magma Mountain); Mini-Games and Bonus Stars.
- **Mario Party 2** (game 27): Items and the Item Shop (item); Bowser Land and the final showdown (boss). Other:
  Starting out; Pirate Land; Western Land; Space Land; Mystery Land; Horror Land; Battle, Item and Duel Mini-Games.
- **Mario Party 3** (game 28): Items and the Item Shop (item). Other: Starting out; Chilly Waters; Spiny Desert; Creepy
  Cavern; Duel Boards and how they work.
- **Mario Party 6** (game 29): Orbs (item); Clockwork Castle, the final board (boss). Other: Starting out; Towering
  Treetop; E. Gadd's Garage; Snowflake Lake; Castaway Bay; Mini-game types and Mic Mode.
- **Mario Party 7** (game 30): Orbs (item); Bowser's Enchanted Inferno!, the final board (boss). Other: Starting out;
  Grand Canal; Pagoda Peak; Pyramid Park; Windmillville; Mini-game types and Bowser Time.
- **Super Smash Bros.** (game 34): Items (item). Other: Starting out; Knocking opponents out; Mario; Pikachu; Fox; The
  1P Game.
- **Super Smash Bros. Melee** (game 25): Fox and Falco (enemy); Marth, Sheik, Jigglypuff and Peach (enemy). Other:
  Starting out; The techniques the game never tells you about; Surviving hits; Edgeguarding and the ledge; Shields,
  grabs and punishing; Unlocking the other eleven; The single-player modes; Classic Mode's Metal Battle.
- **Grand Theft Auto III** (game 35): Weapons (item); Vehicles (item). Other: Starting out; The mission structure; The
  wanted level; An early gang-war job; Side jobs and extra missions.
- **Yoshi's Story** (game 32): Hearts, melons and Yoshi's Mood (item); The coloured Yoshis (item); The Slug mini-boss
  (boss); Baby Bowser (boss). Other: Starting out; Fruit and the Smile Meter; Picking story pages and levels.
- **Diddy Kong Racing** (game 33): The Golden Balloons (item); Weapon Balloons (item); The four world boss races
  (boss); Wizpig (boss). Other: Starting out; Bananas and Zippers; The vehicles; Unlocking Drumstick and T.T.
- **Fallout: New Vegas** (game 20): Deathclaws and Quarry Junction, Cazadores, Night stalkers (enemy); Weapon mods and
  the unique guns you can get early (item). Other: Starting out; Hardcore mode; Reputation, disguises and hit squads;
  Companions; Getting into the Strip; Skills, SPECIAL points, implants and books; Snow globes and star bottle caps;
  Choosing early armor; Crossing the crater radiation pools.
- **Brotato** (game 36): The wave 20 bosses (boss); Elite enemies at Danger 2 and up, Support enemies that buff and
  heal, Early regular enemies (enemy); Item rarity and tags, Legendary loot crates from Elites (item). Other: Starting
  out; The shop and rerolling; Materials, gold and experience; Danger levels; Elite and Horde waves; Characters and
  item tags.
- **Palworld** (game 37): The five kinds of boss fights, Towers and Faction Leaders (boss); Alpha Pals as roaming world
  bosses, What makes an Alpha Pal tougher (enemy); The Pal Sphere, Weapons and ammo (item). Other: Starting out;
  Catching Pals; Building and running a base; Keeping Pals working; Breeding Pals; Technology points and the tech tree.
- **Skyrim Special Edition** (game 38): Dragon Priests (boss); Alduin (boss); Dragons, Draugr, Falmer (enemy); Smithing
  and gear tiers, Daedric artifacts, Dragon Priest Masks (item). Other: Starting out; Leveling; Skills and perks; Dragon
  Shouts; Standing Stones; Enchanting; Werewolves and vampirism.
- **Hollow Knight** (game 15): False Knight, Hornet in Greenpath, Mantis Lords, Soul Master, Watcher Knights, Broken
  Vessel (boss); Primal Aspid (enemy); Nail upgrades and Pale Ore, Movement abilities and where they are (item). Other:
  Starting out; Dying, your Shade and lost Geo; Charms and notches; Soul, Focus and spells; Leaving the Forgotten
  Crossroads.
- **Black Mesa** (game 14): Tentacles, Gonarch, Nihilanth (boss); Gargantua, HECU Marines, Houndeye (enemy); Tau Cannon,
  Gluon Gun, Hivehand, Long Jump Module (item). Other: Starting out; The opening tram ride; Recharging the HEV suit;
  Crossing the electrified waste pools.
- **DOOM Eternal** (game 16): Doom Hunter, Gladiator, Khan Maykr, Icon of Sin (boss); Marauder, Cacodemon, Whiplash,
  Arch-vile (enemy); Super Shotgun and meat hook, The Crucible (item). Other: Starting out: the combat loop; Weak points
  worth shooting; Slayer Gates, keys and the Fortress; Monkey bars and swing traversal.
