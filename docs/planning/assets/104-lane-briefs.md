# Plan 104: the briefs, one per helper

How a brief is assembled: the session hands each helper `104-helper-rules.md`, the section below with its letter, the
tip hash, the absolute path of its copy, and the plan number (104). Nothing else is needed. A section says: what a
player sees today, where it comes from (files and the reading behind it), what to build, the files owned, the test at
the Deck's level, and the Deck check that proves it (the row). Evidence files are named `plan104-<ROW>.json` by the
driver, never by a helper. Line numbers are as read at tip `d58e3155` on 2026-11-14 by the planning chat and ten
read-only lookups, checked against the code; a lane that finds a line has moved re-greps and says so in its report.

Model and effort per lane are in the plan's § 4 and § 5. A lane that finds its brief wrong says so and stops rather
than building the brief's mistake. "The workshop" is `C:\Users\still\Documents\bonsAI-workshop`.

---

## K0 — The bookkeeper's audit before anything lands (★ docs, Sonnet medium; the same brief again as K9 at the end)

**What this is.** The knowledge-base roadmap must be right before the first lane lands, and it has no room left. Make
room, write the decision, take the answered calls off the list, and apply what planning found. One commit; every change
named in your report; invent no result. You work in your own copy and are landed like a lane. Check each correction
against the code, the data or the evidence file before you write it; if a check fails, leave the entry as it is and
say so.

**In this order:**
1. **Make room first** (sizes measured the ratchet's way, line endings normalised; `scripts/ratchet.json` has the
   limits). `docs/roadmap-kb.md` is 24.97 KB of 25: move these, word for word, to `docs/roadmap-kb-details.md` under a
   new heading "Plan 104 notes moved from the knowledge-base roadmap (2026-11-14)", each leaving a one-line stub with
   its status word and a Detail link: the two "Answered" paragraphs (lines 41 to 42) and the older one at line 40; the
   four ACCEPTED entries' bodies (lines 49 to 50, 53 to 56, 74, 77); the P100-TIPS-01 history (lines 89 to 90). Aim for
   21 KB or less. `docs/testing.md` is 164.95 KB of 165: move the oldest closed rows to
   `docs/archive/testing-closed-2026.md` the way plan 103's sweeps did (one summary row listing the ids), until it is
   at 155 KB or less. `docs/roadmap-shelved.md` is 20.00 KB of 20: move its oldest dated text to the matching archive
   file until there is 1 KB of room. Nothing is deleted; say in your report what moved.
2. **Decision D141**, appended to `docs/audit/maintainer-decisions-locked.md` in the house shape of D140: the heading
   "D141 — LOCKED 2026-11-14 (raised 2026-11-14) — Plan 104, the knowledge-base wave seven: the thirty-one calls", then
   plan 104 § 2 word for word (calls 1 to 10 as answered; calls 11 to 31 with the answers your task names, the defaults
   unless it says otherwise) and the usage figures at go (your task gives them). Check 141 is free first; D138 is
   reserved by plan 101's asset file and D142 by plan 105; take neither.
3. **"Calls waiting on you"** in `docs/roadmap-kb.md`, by D141:
   - the crowding trade: answered, a third try with "Starting out" notes left out (lane R1). Remove the call; the Bugs
     entry says so.
   - the chips' rotation: answered, the closest chips stay in front for a while (lane C2). Remove the call.
   - the two settings backup files: answered, delete both (block D0a). Keep the line until the evidence file
     `plan104-P104-D0-BACKUPS.json` exists, then remove it in the next sweep.
   - "keep the honest answer on": it stays on while lane H1 builds the fix (call 12). Reword; it closes when H1 lands
     or is turned down.
   - the Speed-mode option: measured again by lane H1 (call 13). Reword.
   - the two reads stay. Add one line: "Your two samples of ten" (the new notes; the rewritten older notes), each
     added when its file exists.
4. **Corrections the planning audit found.**
   - Phase 5, the blind questions: `tests/fixtures/kb_eval/` holds 21 question files and 620 rows today, 584 of them
     for the 20 games and 36 for the mod tips (count them again). Reword "584 rows in 20 files".
   - The screenshot entry, "22 show a boss": `tests/fixtures/screenshot_eval_v1.json` has 24 pictures with a boss or
     enemy name filled in (23 ids starting `p5-`, and `p1-oot-wolfos-pair`); the marks test used 22. Say both.
   - "Where things stand" and the first paragraph of "Deck check owed": date them 2026-11-14 and add the crash fix of
     11 November (`d58e3155`) and its owed row P104-KB-THREADS-01 (`docs/testing.md`, about line 257). The sentence
     "every Deck check ... has run, or is named here" must be true when you finish.
   - **Move the `[KB]` Verify entry** "Installing Ollama timed out because bonsAI's back end had crashed in the
     knowledge library's database code" (`docs/roadmap.md`, about lines 305 to 308) into `docs/roadmap-kb.md`, "Deck
     check owed", at its three-star place (house rule 2: knowledge-base work lives there).
   - The decisions file: D82's heading (about line 352) says "OPEN" while the roadmap says ACCEPTED, decided
     2026-09-06. Read D82's text; make the heading agree with what its text records, and say which you changed.
5. **Readings from planning, added to the entries they belong to** (one sentence each, dated 2026-11-14):
   - Bugs, borrowed advice: on a marked turn the loosely matching notes are still handed to the AI, and the
     instructions still say to ground the answer in them. Plan 104 lane H1.
   - Bugs, a game the library does not hold: the plugin already knows (Show details says "none for this game"); the
     maintainer's call of 2026-11-14 is a small line under every answer, in every mode. Lane H2.
   - Bugs, the three versus mix-ups: Speed mode never runs the "lead with the note the question names" rule. The six
     rows: the roadmap's long notes name V2-S-L4D2-29 where the R1b record
     (`workshop:archive/research/kb-crowding-fix-2026-11-10-p103-r1b.md`) names V2-S-L4D2-11. Read both rows in
     `tests/fixtures/kb_eval_v2.json` and the record, and write the right list. Lane V4.
   - Bugs, the ring above the pane: the scroll after reopening is held back by where the ring is only if something
     holds the ring at that instant. Lane F1, after block D0's reading.
   - Bugs, the "notes were used" line: only the control with the ring is lifted clear of the dock, and the line is
     not a stop. Lane F1.
   - Bugs, the quotes not yet sorted: twelve files, 1,646 quotes, about 150 pages to fetch again; lanes S1 to S4.
     "About twenty Weak points lines" becomes the count: 22 of 184 (16 clear, 6 borderline); the ids go to the long
     notes (they are in briefs M1, W1 and S1 to S4 below).
   - Bugs, older notes the wiki contradicts: the sightings with their note numbers (briefs M1 and M2 below) go to the
     long notes. Lanes M1, M2.
   - Bugs, the crowding entry: the cause found on 2026-11-10 in one sentence ("Starting out" notes lifted past a real
     word hit) and "third try, plan 104 lane R1, your call of 2026-11-14".
   - Bugs, Radscorpions: ACCEPTED (D141 call 15): every search stays inside one game.
   - Next, Phase 5: what closes it now (D141 call 18); the Half-Life 2 and Black Mesa source (call 8).
   - Next, the Deathclaw and defibrillator notes: lane M1.
   - Next, the versus entry: lanes V4 and V5; and bring plan 17's own progress table
     (`docs/planning/17-kb-online-versus-strategy-content.md`) up to date: it still says the role notes are only
     planned.
   - Next, mod knowledge: lanes L1 and L2 (D141 calls 6, 10 and 30).
6. **Three paper closings** (D141 calls 15 to 17), each only if "go" took the default:
   - **KB visual maps** moves to `docs/roadmap-shelved.md` with its numbers (best average 2.95 of 10 against a bar of
     7; at most 5 of 22 pictures with a try at 7 or more) and the bar that reopens it (a picture model the Deck can
     run averages 7 or more on at least 15 of the 22 boss pictures, graded by Opus by the written rule; the test is
     `scripts/kb/eval_screenshot_marks.py`).
   - **The screenshot measurement** closes: one line in the knowledge-base Done list in `docs/roadmap.md` with its
     numbers, the full entry to the completed archive. What stays, said in that line: the picture's own guess is
     switched off (it reopens when a model finds the right note about twice as often); row P102-PICTURE-01 stays in
     "Deck check owed" under its own entry.
   - Radscorpions, as above.
7. **The six main-roadmap entries this plan takes** (`docs/roadmap.md`, Bugs; plan 105 is not running, so this plan's
   bookkeeper holds that file's pen until the session says otherwise): add "plan 104 lane <letter>" to each, and these
   corrections. The freeze entry: the lowest reading in the evidence is 970 MB available and about 900 MB at the end
   (`workshop:planning/assets/103-handover-D0a.md`); both picture tries timed out, at 181.1 and 181.2 s; the
   maintainer's call of 2026-11-14 is "warn, then let me ask anyway". The summed-up note entry: the plugin has a stop
   for it; Steam does not (no nav node). The cut-chip entry: probably a long label caught mid-scroll; block D0
   confirms, lane T3 fixes the look check, and the chip's new look is plan 105's (the maintainer's call there: keep
   the sliding, fade the cut ends). The long-chat entry: the plan 105 chat's lookup found no fault (no summary was
   due; that path writes nothing); lane B2 confirms it and adds the log line.
8. **`docs/testing.md`:** one row, status open, for every check in plan 104 § 6 (every row named in the blocks table),
   each saying what it needs and what a pass is, in the shape of the plan 103 rows beside them. A row that already
   exists (P104-KB-THREADS-01, P103-NOTES-AFTER-AUTO-OPEN-01, STRAT-SPOIL-NAME-01, P103-DETAILS-STRIP-01,
   P102-UNDO-FOCUS-01, P102-PICTURE-01, P103-NOTES-23-01, P103-CHIP-ORDER-01) is not repeated.
9. **`docs/mcp-setup.md`, the findings log:** mark as overtaken the rows the tools project has since fixed or that a
   later run disproved (the non-Steam shortcut row: it worked on 2026-11-09; the replay-all row: guarded since
   2026-11-02; the run-files row: `outDir` and `saveAs` since 2026-11-02), and add one dated entry: none of plan 103's
   six asks is built; the flaky test is `pressDeadline.test.ts`; about twenty rows still read "needs filing". The
   drafted issues go to `workshop:planning/assets/104-deck-tools-issues-draft.md`, one per gap. Post nothing.
10. Every entry you touched: the status word agrees with its newest dated note; five lines at most; every link
    resolves; stars ascend in every list.

**Files owned:** `docs/roadmap-kb.md`, `docs/roadmap-kb-details.md`, `docs/roadmap.md` and its archives (items 4, 6
and 7 only), `docs/roadmap-shelved.md` and its archive, `docs/testing.md` and its archive,
`docs/audit/maintainer-decisions-locked.md`, `docs/planning/17-kb-online-versus-strategy-content.md` (its progress
table), `docs/mcp-setup.md`. End with `python scripts/docs_toc.py` if a heading changed, then
`python scripts/verify.py --quick` (gate on its exit code, not on the last lines it prints). Commit when told.

**As K9, at the end:** the same checks after the last landing and the last Deck block, from the session's final result
list: every entry moved this session names its row and its evidence file (confirm each file exists in the workshop);
every number in "Where things stand" is counted from the data files that day; the entries read as D141 calls 15 to 19
say; every roadmap file is under its limit; `docs/planning/37-rag-status-report.md` gets one dated paragraph.

## K — A sweep after a landing chain or a Deck block (Sonnet medium, the bookkeeper's file as instructions)

The session hands you a result list copied from the landing logs and the evidence files. A landed fix moves from Bugs
or Next to "Deck check owed", naming the row it owes. A Deck pass moves to Done in `docs/roadmap.md`'s knowledge-base
list with its evidence file; a fail goes back to where it was with what was seen; UNCLEAR and COULD NOT RUN are written
as such, never as a pass. A new bug or a new owed check the session lists goes in at its star place, five lines at
most. The testing rows and the changelog change in the same commit. Confirm every evidence file exists before you cite
it. Keep every roadmap file under its limit (move older text to the long notes, word for word). You work in your own
copy; do not commit while a landing runs in the shared checkout unless your task says so.

---

## T1 — One call runs a whole list of questions on the Deck (★★ `[QA]`, Sonnet high)

**What is wrong today.** One question checked on the Deck costs a driver about six tool calls and forty seconds
(`workshop:planning/assets/103-handover-D0a.md`, line 13), and the tools' replies are large enough that a driver's
working memory fills in ten to fifteen minutes. Last wave most blocks needed three drivers.

**What exists.** `scripts/deck_kb_readback.py` reads the newest answer's state in one call (its notes line, covers,
the two honesty lines, the ring, the page's focus, the log's attach line); it runs on the Deck as
`ssh deck@192.168.86.52 'python3 - --json' < scripts/deck_kb_readback.py` and prints one JSON object.
`scripts/deck_send_ask.py` types a question and does not send it. `scripts/deck_overnight_run.mjs` is the precedent for
a script that starts the Deck tools' server itself (over stdio) and calls its tools. The tools project is at
`c:/Users/still/decky-plugin-studio` (read it, never change it): `deck_typeText` with `clear: true, submit: true` puts
a question in and sends it with an Enter key event; it is refused when nothing holds the ring, and after an answer
nothing does, so one Down (`deck_walkTo`, direction DOWN) places the ring on the question box first (with a game up,
Up from Ask). The plugin's log is `~/homebrew/logs/bonsAI/*.log`; the line that says an answer's notes are settled
contains "notes for this answer:".

**Build.**
1. `scripts/deck_ask_rows.mjs`: reads a rows file (a JSON list; each row has `row`, `question`, and may have `mode`,
   `chat`, `waitSeconds`, and an `expect` object) and for each row, in order: reads free memory and whether a game is
   running (`free -m`, `pgrep -f '[S]teamLaunch AppId'`) and skips the row with "COULD NOT RUN: memory" when a game is
   running and "available" is under 3,000 MB; checks the open chat's name against `chat`; places the ring; types and
   sends; waits until the log shows a new "notes for this answer:" line and the reply's action row is drawn, up to
   `waitSeconds` (default 240); runs the read-back; writes one evidence file
   (`<workshop>/test-evidence/plan<NN>-<row>.json`, with the field names `.claude/agents/deck-driver.md` rule 3 lists,
   `-try2` if the name exists, never overwriting); and prints **one short line per row** (the row, seconds, the notes
   attached by number and name, which honesty line showed, covers shut and open, the ring's label, the page's focus).
   The `expect` object only compares fields (`notesInclude`, `notesExclude`, `line`, `covers`); a row with no `expect`
   prints what was seen and leaves the verdict to the driver. It never presses A, B, START or SELECT. It stops the
   whole list at two timeouts in a row, or when a tool refuses for the stop switch.
2. **The lease.** Each chat's tool server holds the Deck's lease for its own calls, and the script's server is a
   different one. Read how the lease is taken and released in the tools project and make the script: refuse to start,
   with a plain message, while another holder's lease is live (the driver releases its own with `deck_releaseMachine`
   first); and release its own at the end, also when it stops early. Pass the row's name as `rowId` on every call.
3. `scripts/deck_kb_readback.py`: `--turns N` returns the last N answers (newest first), and each attached note
   carries its number as well as its name (the log's attach line has the numbers). The default output is unchanged.
4. A header on each file in the house shape; a `--dry-run` that prints what it would do and touches nothing.

**You never run either script against the Deck** (rule 9). Tests: the rows file's parsing and refusals; the evidence
file's name and the never-overwrite rule; the stop at two timeouts; the `expect` comparisons; all with a stand-in for
the tool server. Say in your report exactly how a driver calls it and what the three most likely failures print.
**Files owned:** the new script, `scripts/deck_kb_readback.py`, their tests. The security reviewer reads the script
before it lands. **The Deck check (P104-D0-RUNNER, block D0a):** a list of three questions runs in one call; three
evidence files exist; the time and the number of tool calls are compared with the old way.

## T2 — The answer test counts honest answers and borrowed advice (★ `[QA]`, Sonnet high)

**What is wrong today.** The answer test's count of "said so in its own words" read 0 where a hand reading of the same
answers found admissions (`workshop:archive/research/kb-honest-unknown-2026-11-10-h1.md`, § 7). And nothing counts the
fault lane H1 must fix: after an honest opening, the reply gives detail borrowed from notes about something else.

**Where it is.** `scripts/kb/eval_kb_answers.py`: the phrase list `UNKNOWN_ADMISSIONS` (about lines 697 to 708), the
hedge pattern (about 713), `said_so_own_words` (about 1091: the phrases looked for after `strip_back_end_footers`).
Phrasings the record says it misses: "I do not have specific", "I don't have specific", "I have no specific", "I lack
specific", "I do not have notes", "since I don't have".

**Build.**
1. Add the missed phrasings (and any other the saved answers in the h1 and r2 records use), each with a test built from
   a real reply quoted in those records. Report the count before and after on the saved answers.
2. A new count per answer on a turn the plugin marks, `borrowed_from_notes`: after the opening sentence, does the reply
   state specifics that come from the attached notes and that the question did not contain (a named move, a weak
   point, a number, a place)? Build it from the attached notes' own distinctive words, not from a list of games.
   **Prove it against a hand reading:** take the saved made-up-boss answers in the h1 record (the "Grimthak" and
   "Zorblax" runs), read each yourself, mark borrowed or not, and report how often the count agrees with you. Under 20
   of 24, say so plainly and say what it misses: lane H1 then also reads its answers by hand.
3. The test's summary prints both counts beside "facts kept".

**Files owned:** the answer test's script, its tests and its fixture. You are the only lane that edits it. **The test
at the Deck's level:** none; lane H1 is judged by these counts, so say how sure they are.

## T3 — The look check stops calling a scrolling chip label "cut words" (★ `[ui]` `[QA]`, Sonnet medium; after block D0)

**What was seen.** The look check found the second suggestion chip's words cut at the screen's right edge
(`workshop:test-evidence/plan103-QA-LOOK-01-p103.json`; the picture shows "ix Steam Input for this ga"). A long chip
label scrolls inside its chip on purpose (`src/features/preset-carousel/presetChipLabel.ts`, about lines 35 to 110;
the two chips are equal flex slots, `src/styles/sections/section-4.ts`, about 199 to 209). Block D0's row
P104-M-CHIP-CUT says whether the label does scroll into full view; your task carries its result.

**Build, if D0 confirms it is the scroll:** in `scripts/probe_deck_ui_look.py`, a label inside a chip's own scroller is
judged by whether it scrolls, not by whether its words fit at one instant. One test with a long label. **If D0 says the
words never come into view,** stop and report: that goes to plan 105 with D0's numbers. You change only the check: how
the chip itself should look (fading its cut ends) is plan 105's, drawn first. **The roadmap entry is not closed by
this lane.** Its line for the bookkeeper: "the look check's false alarm is fixed (plan 104); the softer look is plan
105's". **Files owned:** the look check script and its test. **The Deck check:** QA-LOOK-01 on Main reports nothing
while a long chip is on screen.

## T4 — The wiki reader says "failed" when a wiki is down (★ `[KB]` `[QA]`, Sonnet medium)

**What was seen 2026-11-14.** Combine OverWiki's database was read-only (its api answered HTTP 500,
`internal_api_error_DBReadOnlyError`). `scripts/kb/fetch_wiki_live_pages.py` still exited 0, printed
`[ok] 'Headcrab' rev 488013 ... 1 chars`, and `--search` printed an empty site line and "licence: (none declared)".
A note lane could have taken that for a page.

**Build.** An api error body, an HTTP error, or a page whose text is shorter than a small floor (pick it from the
shortest real page under `build/wiki-live/`, and say what you picked) is printed as `[failed]` with the wiki's own
message, listed in the manifest as failed with the reason, and never written as a page file. The exit code is not 0
when every page failed. `--search` prints the api's error instead of an empty line. A missing page stays what it is
today ("missing", exit 0). Tests with canned responses for each case. **Files owned:** the reader and its tests.
**The test at the Deck's level:** none.

## X0, X1, X2 — The numbers, before, in the middle and at the end (★★ `[KB]`, Sonnet medium, long jobs)

One measurement at a time (rule 10). Each run's report is kept in the workshop's `archive/research/` with
`-p104-before`, `-p104-middle` or `-p104-after` in its name. You commit nothing.

- The search test: `python scripts/kb/eval_kb_embed_models.py --arms-only --force-rebuild --write-report`.
- The plugin's own search and its "No close match" line: `python scripts/measure_kb_thin_match.py --line-gate`
  (about two minutes).
- Tips: `python scripts/measure_kb_floor_holdout.py`.
- Answers: `python scripts/kb/eval_kb_answers.py --samples 3`, twice, with different `--seed-base` values; the gap
  between the two runs is the noise (about seven minutes a run). X1 and X2 run it only after lane T2 has landed, so
  the two new counts are in.

**Report one table:** the right note in the first three on the 628 older held-back questions, on the newer rows, and
on the thirty meaning-only questions (18 today); exact word match first; "No close match" shown; the Left 4 Dead 2
rows one by one (X1 runs these before and after lane V5's notes: no row that finds its note before may lose it);
facts kept; said so in its own words; borrowed from the notes. X0 is the tip at go. X1 runs once lanes V4, H1 and R1
have landed or been turned down. X2 runs on the final library and also tries it against the released plugin's code,
as plan 103's lane X3 did (does it open, does anything error, do the same notes attach).

---

## H1 — Borrowed advice after the honest opening (★★★ `[KB]`, Sonnet high). You alone edit the prompt file and the request file this session.

**What a player sees today.** Asked about a boss that does not exist ("Grimthak"), the reply opens by saying its notes
do not cover it, then gives advice about weak points on its armour and area attacks, lifted from the nearby Dreadnought
notes (`workshop:test-evidence/plan103-P103-HONEST-02.json`, third question).

**Where it comes from.** `py_modules/backend/ask/game_ai_request.py`: the notes are fetched and become `kb_text` (about
lines 609 to 638), are stacked into the context (`stack_context_blocks`, about 656), and go to the AI as
`proton_log_attachment` (about 891). The fact "this turn's notes do not cover the question" is worked out afterwards
(`prompt_turn_flags`, about 869; `py_modules/backend/knowledge/kb_notes_turn_flags.py`). In
`py_modules/backend/prompts/ollama_prompts.py` the honest sentence is added on such a turn (`HONEST_UNKNOWN_ON`, about
299; wording "g", about 352 to 356; `_honest_unknown_line`, about 360; appended about 708), while the same prompt still
says "Ground answers in the attached strategy/compat cards when relevant" (about 681), an order that is added whenever
the block carrying "Local knowledge base" is present (about 676). Two orders pulling against each other.

**Build, in this order.**
0. **Make room.** The request file is one line under its limit. Your first commit moves one self-contained piece out to
   a new file (a move only, behaviour unchanged, the header in the house shape).
1. **Two versions, each behind its own switch, both off:**
   - **Leave the notes out.** On a marked turn the notes block is not sent to the AI (so the "Ground answers" order
     and the other lines that ride on the block go with it). What the turn then reports must be true to what the AI
     saw: the on-screen notes line, the attached-notes list and the log's attach line must not claim notes were used.
     The "No close match" line still shows. Work the turn's facts out before the stacking, not after.
   - **Fence the notes.** The notes stay, and on a marked turn the "Ground answers" order is replaced by one sentence:
     these notes are about other things in this game; use one only if it names the thing asked about, and otherwise
     take nothing from them. One sentence, counted (rule 25).
2. **Measure both** (after lane T2 has landed; one measurement at a time) with `scripts/kb/eval_kb_answers.py`, three
   tries, two runs with different seeds, on: the eight unanswerable questions (said so in its own words; borrowed from
   the notes; read the made-up-boss answers yourself as well and report your own count beside the script's); the
   ordinary set (facts kept; the noise is about two points); and the turns where the line shows beside a right note.
   A comment in `py_modules/backend/knowledge/kb_not_in_notes_notice.py` (about line 175) records that about 1 marked
   turn in 17 has the right note attached anyway: find those rows with `scripts/measure_kb_thin_match.py --line-gate`
   and report, for each version, what the answer keeps and loses on them.
3. **The landing rule (plan 104 § 2, call 12).** A version lands switched on only if a made-up boss gets no borrowed
   detail in at least 5 of 6 answers in both runs and ordinary answers keep their facts within the noise. If both
   pass, the one that keeps more on the right-note-anyway rows. If neither, both land switched off with the numbers.
   The second opinion reads the sentence and the tables before anything lands switched on; hand the session both
   tables.
4. **The Speed option, measured again** (`HONEST_UNKNOWN_IN_SPEED_ON`, about line 313; off). With the winner in place:
   six tries of a made-up boss in Speed mode, and the ordinary Speed set. Report the numbers; change the switch only if
   your task says so (call 13 is the maintainer's to confirm).

**Pinned, and must not move:** every saved fingerprint of an unmarked turn (`tests/test_spoiler_tier.py`, about lines
79 to 96, with `tests/fixtures/spoiler_default_tier_golden.json`; `tests/test_ollama_prompts_honest_unknown.py`, about
171, 250 and 502). The test that says the honest sentence is "exactly one added line" (about 258) changes only for the
fenced version, and you say so. **Files owned:** the request file and the file you move a piece into, the prompt file,
the turn-facts file, `tests/test_ollama_prompts_honest_unknown.py` and the tests you add.
**The test at the Deck's level:** through `run_game_ai_request` with a stand-in model: on a marked turn, what reaches
the model holds no note text (or holds the fence), and the turn reports no notes used; on an unmarked turn every byte
is as before. **The Deck check (P104-HONEST-03, block D2):** three made-up names, each worded once, Strategy: every
reply opens by saying its notes do not cover it and gives no detail about the made-up thing; one real boss question
reads as before.

## H2 — "No notes for this game", under every answer (★★ `[KB]`, Sonnet high)

**What a player sees today.** With Stardew Valley or Terraria running, bonsAI answers from the model's memory and says
nothing about it, in any mode. That is most people's games: the library holds 38.

**Where it comes from.** `py_modules/backend/knowledge/kb_not_in_notes_notice.py`: the two honest lines
(`_NOT_IN_NOTES_LINE`, about line 29; `_NO_CLOSE_MATCH_LINE`, about 153) are only for Strategy and Expert
(`_ELIGIBLE_ASK_MODES`, about 38) and only when the game is one the library holds (`_COVERED_STATUS = "sections"`,
about 45). The plugin already knows the other cases: `py_modules/backend/knowledge/knowledge_base_chips.py` (about
lines 183 to 219) returns `app_unresolved` when a game is running or named and the library has no entry for it,
`no_sections` when it has an entry and no notes, and `no_app` when no game is involved at all; that status is known
before the AI is asked (`game_ai_request.py`, about line 483) and is what Show details prints as "KB: none for this
game" (`transparency_service.py`, about 295). With nothing running, `py_modules/backend/knowledge/
kb_other_game_named.py` has a short list of well-known games (`_WELL_KNOWN_OTHER_GAMES`, about line 30;
`other_game_named_in`, about 78), which names Stardew Valley and Terraria; today it is only used through
`other_game_besides`, which returns nothing when the chat has no game of its own.

**Build (the maintainer's call 7: a small line, drawn by the plugin, every mode; no sentence for the AI).**
1. A third line, in the same shape as the other two: *"No notes for this game — this answer is from the model's own
   knowledge."* It is added by the footer step (`py_modules/backend/knowledge/kb_notes_footers.py`,
   `append_kb_notes_footers`) in **Speed, Strategy and Expert** when the library is switched on and present, the
   question is a game-help question (not a thank-you; not a turn that went to the troubleshooting tips), no game note
   was attached, and either the status is `app_unresolved` or `no_sections`, or nothing is running and the question
   names a well-known game the library does not hold. A genre card attached for such a game does not count as a game
   note: the line still shows. Never together with one of the other two lines.
2. Not on `no_app` with no game named; not with the library off or missing; not on a turn the tips answered.
3. The turn facts the prompt gets (`kb_notes_turn_flags.py`, lane H1's file) do not change: this line tells the
   player, not the AI. If a test pins "a footer is added exactly when the fact is set", scope it to the two older
   lines in a way that leaves lane H1's file alone, and say how in your report.
4. Search first (rule 23): every place the two older lines are known gets the third (the answer test's footer
   stripper is lane T2's file: list it in your report and the session passes it on; copied text; any screen rule that
   styles the lines).

**Files owned:** `kb_not_in_notes_notice.py`, `kb_notes_footers.py`, `kb_other_game_named.py`, their tests and the
tests you add. **The test at the Deck's level:** through `run_game_ai_request` with a stand-in model, in all three
modes: a game the library does not hold ends with the line; a game it holds does not; nothing running and "Terraria"
named ends with it; nothing running and no game named does not; a thank-you does not; a troubleshooting question does
not. **The Deck check (P104-NO-NOTES-LINE-01, block D1):** Stardew Valley running, one question in Speed and one in
Strategy: both answers end with the line (a picture of each for the checks page); Hollow Knight, nothing running: no
such line.

## V4 — The three Left 4 Dead 2 mix-ups (★ `[KB]`, Sonnet high; the search path, lands alone)

**What a player sees today.** (1) In Speed mode "how to beat tank" leads with the versus note about surviving the
Tank. (2) In Strategy the Tank question leads with the right note, but the versus note attaches second and the answer
leans on it (facts kept 0 of 9). (3) "Any tips for pouncing well when I'm on the infected team" leads with the
survivors' note about the Hunter, not "Playing as the Hunter".

**Where it comes from.** `py_modules/backend/knowledge/knowledge_base_search.py`:
`_lead_with_the_note_the_question_names` (about lines 507 to 518) moves the ordinary note a question names by title to
the front when the first note is a game-mode kind (`_MODE_KINDS`, about 492) and the question names no mode
(`_MODE_WORDS`, `_MODE_PHRASES`, about 493 to 494). It is called from one place, the end of the blend
(`knowledge_base_service.py`, about line 865). Speed mode never reaches the blend: it attaches one note
(`top_k=1`, about 528), does no meaning search, and goes through `_merge_preferred_first_demoted` (about 499, called
about 1230), which is word order only.

**Build, one commit each.**
1. The Speed path applies the same rule (it needs no meaning search).
2. When the question names no mode and no side, a game-mode note about the subject the leading ordinary note covers is
   not attached beside it. Nothing else is filtered; a question that does name a mode is untouched.
3. When the question names a side or a mode (the phrases already listed), a game-mode note about the named subject
   leads the ordinary one.

**Measure** with the search test and the plugin's own search before and after (rule 10): the six rows the roadmap
lists get their note back or you say why not (`tests/fixtures/kb_eval_v2.json`: V2-PARA-S03, V2-BLINDT-19,
V2-BLINDT-23, and V2-S-L4D2-29 or -11, which the bookkeeper is settling; `tests/fixtures/kb_eval/
p103-left-4-dead-2.json`: V2-P103-L4D2-13 and -16); no row of another game moves; no Left 4 Dead 2 row leaves its
first three. The fixture check goes in your landing log. **Files owned:** the search file, the Speed-mode merge
function in the service file, their tests. Lane R1 owns the blend function in the same service file and is re-based
on your landing. **The Deck checks (block D1):** P104-VERSUS-SPEED-01 (Speed: "how to beat tank", worded once,
attaches the Tank note), P104-VERSUS-TANK-01 (Strategy: no versus note attached beside it), P104-VERSUS-HUNTER-01 (a
question from the infected side attaches "Playing as the Hunter" first).

## R1 — The crowding fix, third try (★★ `[KB]`, Sonnet high; the search path, lands alone, after V4)

**What a player sees today.** As a game gains notes, an older question can lose its right note from the three that
attach. On the same 628 older questions the right note was in the first three 581 times before wave six's notes and
572 after; the thirty meaning-only questions fell from 23 to 18.

**Where it comes from.** `py_modules/backend/knowledge/knowledge_base_service.py`, `_fuse_cards_by_rrf` (about lines
759 to 866): each note scores one share for its place in the word list and one for its place in the meaning list. A
note the word search missed is given a place one past the end of the word list (`fts_missing_rank`, about 823), so its
credit shrinks as the list grows. **What was tried:** branch `refactor/p103-r1b` (one commit, `eac42e54`) caps that
place at 5 for notes the meaning search itself found (`MEANING_FOUND_WORD_PLACE_CEILING`, a `meaning_found_ids`
argument, eight tests in `RrfCrowdingTests`). On the 891-note library it brought back 12 older held-back questions
and lifted the meaning-only thirty to 25, but on the plugin's own search it gained 16 and lost 23, moved an exact word
match off first place on 6 questions, and showed "No close match" on 3 new ones
(`workshop:archive/research/kb-crowding-fix-2026-11-10-p103-r1b.md`). Its stated cause: every game's "Starting out"
note ranks high by meaning and gets lifted past a real word hit. An older switch, `DEMOTE_STARTING_OUT_NOTES` (about
line 742, off, measurement only; `_is_starting_out_card`, about 754; `tests/test_kb_ranking_starting_out_demotion.py`),
ranks those notes below all others unless the question asks how to start.

**Build.** Cherry-pick `eac42e54` onto your copy (re-based on lane V4's landing; resolve by hand). Then three versions,
each a switch: (a) the cap, with "Starting out" notes never counted as meaning-found unless the question asks how to
start; (b) the older demote switch alone; (c) both. Measure each on the search test and on the plugin's own search
(`--line-gate`), one at a time, and report one table per version: gained, lost (by row id), exact word match moved off
first place, "No close match" newly shown, the meaning-only thirty.

**The landing rule (plan 104 § 2, call 14).** Lands switched on only if: no test question loses its right note on
either measurement; an exact word match still comes first wherever it does today; "No close match" shows on no
question it did not show on before; the meaning-only thirty do better than 18. If a version only wins on balance, it
lands switched off, and its table goes to the session for the maintainer. The second opinion reads the tables either
way. Also fix the function's docstring where it says the eval script leaves the question blank, if that is no longer
true (read the script). The three rules the 2026-09-06 decision set on purpose are pinned by tests (the D82 tests, and
`test_topic_preference_is_not_a_filter`): they stay green.
**Files owned:** the blend function and its constants, `tests/test_seam_contracts.py` as the branch touches it, the
crowding tests. **The Deck check (P104-CROWDING-01, block D2, only if it lands switched on):** two of the crowded-out
questions, by name, attach their right note.

---

## N1, N2 — Enemy and item notes for Half-Life 2 and for Black Mesa (★★★★ `[KB]`, Sonnet high, one lane per game)

**What a player sees today.** "How do I deal with an Antlion Guard" or "what does the charger do" gets the AI's memory:
these are two of the three games with no enemy or item note in the labelled short-line shape.

**The shape.** The library builder reads every `*.json` under `data/kb/notes/` after the seed. A section has
`section_id`, `game_id`, `section_type`, `name`, `card`, `source_url`, `source_license`, `source_version`,
`crawled_at`. The card is labelled lines (the model is `data/kb/notes/doom-eternal.json` with its `.sources.json`):
`Summary:` one line; `Weak points:` (an enemy or a boss) or `Uses:` (an item) one line; `Looks like:` one line where
the page's prose describes the look; `Tips:` one or two lines. **A "Weak points" line names a weakness the page gives,
or the note has no such line** (22 older ones name none; do not add to them). The sources file gives a header (the
wiki, the licence the reader printed, the licence stored, the game's id, the date, how it was read) and, per line of
each note, the page, the revision and the sentence or table row it stands on.

| Lane | Game | `game_id` | File under `data/kb/notes/` | Numbers | Source |
|---|---|---|---|---|---|
| N1 | Half-Life 2 | 13 | `half-life-2.json` | 2600 to 2699 | the Half-Life wiki on Fandom, `https://half-life.fandom.com/api.php`; the reader prints "CC-BY-SA" with no version; store `CC-BY-SA-3.0`, as the library does for its four other Fandom wikis |
| N2 | Black Mesa | 14 | `black-mesa.json` | 4300 to 4399 | first the 29 pages of Combine OverWiki that the reader saved on 2026-09-05 (the shared checkout's `build/wiki-live/combineoverwiki/`, copied into your copy by the session, each with its revision; the licence as the game's seed notes already store it); then Fandom, only for a sentence that speaks about Black Mesa itself |

**Why this source (the maintainer's call 8).** Combine OverWiki's database has been read-only since 2026-11-09; on
2026-11-14 it still was. Do not read it live. Wikipedia has almost nothing on enemies or items for either game.

**N1.** Ten to fifteen notes. Read on 2026-11-14 and found full (sections on tactics, health numbers): Headcrab,
Antlion Guard, Strider, Hunter, the zombie kinds, Vortigaunt, the Pulse Rifle, the SPAS-12, the Medkit, the chargers.
You also add the wiki's row to `data/kb/NOTICE.md`, in the shape of the other Fandom rows.
**N2.** Eight to twelve notes. Most Fandom pages describe the 1998 game, and Black Mesa changed things: a sentence may
come from Fandom only when the page says it of Black Mesa (the Houndeye page, for one, says how its look differs "in
Black Mesa"). The saved pages not yet used by a note include Headcrab, Vortigaunt, Bullsquid, Barnacle, Snark,
Ichthyosaur, Alien Controller and Satchel Charge. If you cannot stand eight notes on a page, write fewer and report
the shortfall; never fill from memory or from the 1998 game.

**Add, never repeat.** Half-Life 2 has nine seed notes and Black Mesa fourteen (`data/kb/strategy_seed.json`, by
`game_id`; ids 32 to 39, 142, 164 to 174 and 269 to 271 between them). Read them first and write none of their
subjects again. If your fact list contradicts one of them, report it (for a later correction); do not edit the seed.

**How (rule 13, the whole of it).** A fact list per page; the editors' prose and bare table facts only; every quote in
your sources file marked with where it sits; nothing from a quote block, a description box or the game's own text.
Rule 14 twice: these two games hide who and what things are. Keep the fetched pages in `build/wiki-live/<wiki>/` in
your copy: the checker reads them. One commit per three to five notes. A schema check of your own in `.scratch/`
(fields present, numbers in range, the game's id, no repeats, every section labelled) and one library build in your
copy.

**Files owned:** your file and its sources list; N1 also `data/kb/NOTICE.md`. **Your report** lists every note's name,
kind and page; the names only (for the question lane); anything in the older notes the pages contradict. **Nothing
lands before the checker and the licence reviewer have read your final text.** **The Deck check
(P104-NOTES-HL2-BM-01, block D3):** with the session's library installed and nothing running, two questions per game,
each naming a subject from the new file, attach a note from it.

## V5 — Ten to fifteen more Left 4 Dead 2 versus notes (★★★, Sonnet high; lands after V4)

**What exists.** `data/kb/notes/left-4-dead-2-versus.json`, fifteen notes, numbers 4500 to 4514 (scoring, spawning,
playing each side, ambush spots on three campaigns, Survival, Realism Versus), from `left4dead.fandom.com`
(`CC-BY-SA-3.0`). Plan 17's "deepen" stage (`docs/planning/17-kb-online-versus-strategy-content.md`, OV-3.1 to 3.3)
asks for short callout notes and more on team play.

**Build.** Read the fifteen first and list their subjects in your report. Then ten to fifteen new notes, numbers 4515
to 4599, in the same file and its sources list, on subjects they do not cover (the campaigns with no ambush note yet;
team set-ups; the callouts players use), each of kind `versus`, `callout`, `survival` or `realism`. Rule 13 in full.
**The finale stays out of every note** (plan 17's rule): no ending, no last-map event. A note's name says "in versus"
only if an ordinary note has the same name without it. **Files owned:** the versus file and its sources list.
**Nothing lands before** lane V4 has landed, the checker and the licence reviewer have read the final text, and lane
X1 has shown no Left 4 Dead 2 row loses its note. **The Deck check (P104-VERSUS-02, block D3):** two versus questions
attach a new note; a question about a campaign's last map does not give the ending away.

## M1 — The two notes the maintainer asked for, and the open contradicted points (★ `[KB]`, Sonnet high)

One commit per item. For each: fetch the page again with the reader (the wiki the note already cites), make a fact
list, correct the note from it, update its sources entry. Rule 13 in full. You are the first of two helpers in the
seed file; touch only the sections named.

| Item | Where | What |
|---|---|---|
| Fallout 4 Deathclaw | seed, section 9 (a boss note in prose) | The maintainer: "the note should have a sentence or two on the distinction if it's relevant". The page (fallout.fandom.com, read at rev 4721629) says which kind you meet depends on your level and lists variants with levels and differences (alpha, glowing, matriarch, savage, albino, chameleon, mythic), a weak spot on the belly, and tactics. Add two or three plain sentences on the variants that change how you fight; keep the rest. |
| Left 4 Dead 2 defibrillator | `left-4-dead-2.json`, 2209 | The maintainer: "say which campaigns and chapters it is found on". The "Healing items" page (rev 173392) gives no chapter list: about one a level, and No Mercy and The Sacrifice do not normally spawn it. Read the campaign and chapter pages too. Write what the pages do say; if no page gives a chapter-by-chapter list, say so in your report and do not invent one. |
| Left 4 Dead 2 Molotov | `left-4-dead-2.json`, 2206 | The burn times by difficulty: check against the Tank and Molotov pages. If the pages do not clearly disagree, change nothing and say so, so the entry can close. |
| Left 4 Dead 2 "Weak points" | `left-4-dead-2.json`, 2203 | The line gives only health numbers. Name a weakness the page gives, or remove the line. |
| Fallout: New Vegas Hardcore | seed, 224; `fallout-new-vegas.json`, 3810 and 3811 | The ways to heal a crippled limb: the page lists more (the Auto-Doc; the weapon-binding ritual). |
| Palworld Predator Pals | `palworld.json`, 4007; seed, 420 | The wiki's own pages disagree on whether they are scripted. Say only what the pages agree on. |
| Mario Party 7 Snack Orb | seed, 350; `mario-party-7.json`, 3201 and 3213 | "Three turns" against the page's two: check and correct all three places. |
| Brotato Looter | `brotato.json`, 3900 | On the Deck a "Loot Alien" question missed this note. If the wiki uses that name for it, the note says so in its Summary. |

**Files owned:** the seed file (the sections named), `left-4-dead-2.json`, `fallout-new-vegas.json`, `palworld.json`,
`mario-party-7.json`, `brotato.json`, their sources lists. A checker reads your final text. **The Deck check:** none of
its own; block D3's questions for Fallout 4 and Brotato use the corrected notes.

## M2 — The older sightings (★ `[KB]`, Sonnet high; after M1 has landed)

Note writers in wave six saw older seed notes their wiki pages contradict, and nobody has checked them. For each
section below: fetch the page, compare, and correct the sentence or leave it with one line of reason. One commit per
game. Seed sections: Mario Party 314, 315, 320, 322, 323 (Bonus Star wording, "Bowser wanders", Magma Mountain, the
Eternal Star odds); Mario Party 2 324, 330, 331 (the Dueling Glove; the Bowser Space roulette); Mario Party 6 342, 345
(Snowflake Lake "only way"; duels in the last five turns); Mario Party 7 347, 349, 351, 354 (eight players; the Pagoda
Peak price; Windmillville; Enchanted Inferno); Super Smash Bros. 394 (the 1P bonus stages); Cyberpunk 2077 153 (iconic
weapons); Grand Theft Auto III 397 (the bribe). The wording of each sighting is in `docs/roadmap-kb-details.md` (search
"lane M", "Hardcore", "Predator"). **Files owned:** the seed file, those sections only. A checker reads your final
text. Report a table: section, what the page says, what you changed or why not.

## W1 — "Weak points" lines that name no weakness (★ `[KB]`, Sonnet high)

Counted on 2026-11-14: 22 of the library's 184 "Weak points" lines name no weakness. Yours are the ones in five
wave-six files: `grand-theft-auto-iii.json` 3500; `mario-party.json` 2804, 2805, 2806; `mario-party-2.json` 2913, 2914;
`mario-party-3.json` 3002, 3006, 3007; `mario-party-6.json` 3107 (2804, 2914, 3006 and 3007 are borderline: judge them).
For each: read the saved page (fetch it again if it is not in `build/wiki-live/`); if the page gives a way to beat,
stop or avoid the thing, the line says that in plain words; if it gives none, the line goes and the note keeps its
other lines. Check first what the build and the chips expect of a note with no such line (the builder's row checks,
`knowledge_base_chips.py`); if a line is required, stop and report. Update the sources lists. **Files owned:** those
five files and their sources lists. The other twelve such lines sit in files lanes M1 and S1 to S4 own.

## S1 to S4 — The twelve older notes files, cleaned (★ `[KB]`, Sonnet high, four lanes)

**What is wrong today.** A wiki's licence covers what its editors wrote, not the game text they quote. Wave six sorted
every quote in its 21 new files by where it sits on its page and replaced every line that rested on game text (trophy
text, catalogue blurbs, scanner and database entries, booklet lines had all slipped in). The twelve files from plans
100 and 102 never had that: 1,646 quotes. The rule's wording: `docs/lessons-learned.md` (about line 726) and plan 103
§ 13.3.

| Lane | Files under `data/kb/notes/` (quotes) | "Weak points" lines to fix in the same pass |
|---|---|---|
| S1 | `the-sims-4.json` (137), `gta-san-andreas.json` (145), `portal-2.json` (79), `baldurs-gate-3.json` (39) | Portal 2: 1301, 1303, 1304, and 1302 (borderline) |
| S2 | `grand-theft-auto-iv.json` (144), `grand-theft-auto-v.json` (162), `doom-64.json` (168) | Grand Theft Auto IV 1500; Grand Theft Auto V 1405, 1406 |
| S3 | `pikmin-2.json` (203), `donkey-kong-64.json` (173) | none |
| S4 | `super-mario-64.json` (126), `mario-kart-64.json` (97), `paper-mario-the-thousand-year-door.json` (173) | Mario Kart 64: 2110, 2112, 2113, 2114 |

**Build, per file.**
1. Fetch every cited page again with the reader, at the revision the sources file names where the wiki allows it
   (few of the pages are saved: about 24 of 150 match under `build/wiki-live/`), into `build/wiki-live/<wiki>/` in
   your copy. The older sources files use other key names (`excerpt`, `quote`, `from`): read, do not reshape.
2. For every quote, find it on the page and write where it sits, in a new field beside it: the editors' prose; a table
   cell; or the game's own text (a description box, a quote block, an attribution line, a "quotes" section, a codex or
   catalogue entry). A quote you cannot find on the page is listed in your report.
3. Every note line that stands only on the game's own text: find the fact in the editors' prose and rewrite the line
   from your fact list, or drop the fact. A bare number or name from a table is fine.
4. The "Weak points" lines listed for your files: as lane W1's brief says.
5. One commit per file. Report per file: quotes sorted (how many of each kind), lines rewritten, facts dropped, quotes
   not found.

Do not reformat, merge or reword any line that passes (rule 30). **Files owned:** your files and their sources lists.
**Nothing lands before** a checker has read the rewritten lines against the pages and the licence reviewer has read
the file. **The Deck check:** none; lane X2's numbers say what the rewording cost the search.

## Q1, Q2, Q3 — Blind test questions (★★ `[KB]`, Sonnet medium; each after its notes have landed)

**What this is.** Whoever writes a note never writes its test question. From the note lanes, through the session, you
get names, kinds and numbers only, never the text. Two questions per note the way a player types them (one plain, one
terse or misspelled). One new file per subject in `tests/fixtures/kb_eval/`, an object with a `queries` list; the row
shape is in that folder's README and in `p103-doom-eternal.json`: id, split `holdout`, domain `strategy`, the game's
`app_id`, `query`, `intent`, `topic_hint` empty, `withheld_card_terms` empty, `skill_level`, `input_style`, `note`
"Written blind <today> from the note's name only", `expect_section` the note's name. A strategy question that carries a
troubleshooting word ("launcher", "crash") is routed to a tip and fails a test: reword it. Do not open the notes files
or their sources lists.

- **Q1:** `p104-half-life-2.json` (ids `V2-P104-HL2-<NN>`) and `p104-black-mesa.json` (`V2-P104-BM-<NN>`).
- **Q2:** `p104-left-4-dead-2-versus.json` (`V2-P104-L4D2V-<NN>`) for lane V5's notes; and, in
  `tests/fixtures/kb_eval_v2.json`, the versus rows among `V2-S-L4D2-12` to `-29` that still have an empty
  `expect_section`: name the note that answers each from the names you were given, or leave it empty with one line of
  reason in its `note`. You are the only helper that edits that file, and only those rows.
- **Q3:** `p104-mods-lookup.json`: twelve questions that each name one real, well-known Fallout 4 or Skyrim mod the way
  a player would ("what does <mod> need", "where should <mod> go in my load order", "is <mod> ok with <other mod>"),
  and four that name no mod. You choose the mods from your own knowledge of the two games, **not** from the data (lane
  L1 hands you nothing but the two games' names); say for each which plugin file you believe it is. Ask the session
  where these rows may live if the search test's label check refuses a row that names no note.

**Files owned:** your new files; Q2 also those rows.

## CH1, CH2, CH3 — The checker (★★ `[KB]`, Sonnet high; reads and reports, changes nothing)

For each notes file in your batch: read every sentence of the **final** text against the quote its sources list gives
and against the fetched page itself (the lane's `build/wiki-live/` folder; fetch the same revision again if a page is
missing). Report, per file: every sentence that says more than its quote; every quote that is not on the page; every
quote that sits in the game's own text (judge by where it sits on the page, not by how it reads); every name or Summary
that gives a story beat away; every "Weak points" line that names no weakness; every note whose subject the game's
older notes already cover. The note lane fixes what you list and you read the fixes: nothing lands on a text you have
not read.

- **CH1:** lanes N1, N2 and V5. Then pick ten notes at random from the three files (say the seed you used) and write
  `workshop:checks/plan104-sample-new.md`: each of the ten in full, with the page it came from.
- **CH2:** lanes M1, M2 and W1 (the corrected sentences and lines only).
- **CH3:** lanes S1 to S4 (the rewritten lines, and a spot read of thirty quotes per file for where they sit). Then ten
  rewritten notes at random into `workshop:checks/plan104-sample-rewritten.md`, each with its text before and after.

## The licence reviewer (`foss-advocate`, Sonnet high; read-only)

Reads before they land: lanes N1, N2 and V5 with their sources lists; the rewritten files of lanes S1 to S4; lane L1's
data files, their header and the credits the build writes; lane L2's wording. Is every source one the library may use
and credited as its licence asks (the new Fandom row; Combine OverWiki pages read in September; CC0 for LOOT, and the
small risk plan 101's research names: LOOT's contributing guide says nothing about the licence contributors give); is
any line close enough to the source's own wording, or to a game's own text, to need a rewording; does anything in the
mod lookup read as a verdict or as "these work together". One short report per three or four files: what blocks
publishing, what should be fixed first, what is fine.

## The security reviewer (`security-auditor`, Sonnet high; read-only)

Reads before they land: lane T1's script (it reaches the Deck over SSH and starts the tool server); lane G1 (it reads
`/proc/meminfo` and Ollama's local api, and adds a plugin method the screen can call); lane B1 (how a permission is
saved and re-read); lanes L1 and L2 (a new table built from a file fetched from GitHub, and a new path from a typed
question into it: can a mod's name or a rule's text carry anything into the prompt that it should not).

---

## G1 — The low-memory warning (★★★ `[ask]` `[ollama]`, Sonnet high; the session and the security reviewer read it)

**What happened.** 2026-11-09, block D0a: a picture question with God of War running. The model
(`gemma4:e2b-it-qat`, about 5.8 GB when loaded) was loaded beside the game; available memory went 3,578 MB, 1,370,
970; both tries timed out at 181 s; Steam's debug page stopped answering and the Deck was restarted by hand
(`workshop:planning/assets/103-handover-D0a.md`; `workshop:test-evidence/plan103-P102-PICTURE-01-try2.json`). Idle,
the Deck has about 12,000 MB available.

**Read in the code.** Nothing in the back end reads free memory. A text question and a picture question take one path:
`py_modules/backend/ask/ollama_ask_service.py`, `run_ask_ollama`. By about line 319 the models to try, the installed
models and whether the AI is on this Deck (`is_loopback_ollama_host`, about 262) are known and nothing has been loaded;
the chat's own summing-up (about 323) and the answer come after. Two refusals already return from just above (about 299
to 318) as `{"success": False, "response": <text>, "model_policy_disclosure": None, **ollama_extras}`, and the screen
draws such a reply as an ordinary answer; the "AI is not set up" one gets an "Open the Ollama tab" row because the
screen matches the reply's opening words (`src/features/answer/transcript/noAiSetUpNotice.ts`, about lines 18 to 22;
`MainTabChatTranscript.tsx`, about 1673; `ChatTranscriptHintRows.tsx`, about 77). Loaded models and their sizes:
`/api/ps` (`py_modules/backend/ollama/ollama_health_probe.py`, about 44 to 64); installed sizes: `/api/tags` (about
67). `py_modules/backend/ollama/ollama_keep_alive_rule.py` already knows "a game is running" and "the AI is on this
Deck" (about 52 and 66). The background summing-up (`py_modules/backend/chats/chat_sum_up_job.py`) loads a model too.

**Build (the maintainer's call 9: warn, then let the player ask anyway).**
1. A new module (title, purpose and the rest in the house header): free memory from `/proc/meminfo` (`MemAvailable`);
   whether the model that will answer is already loaded (`/api/ps`); what loading it needs (its loaded size if Ollama
   has reported one before, else its installed size times a factor you measure on this PC and state); and one
   question: would loading it leave less than the limit? The limit is one named constant with a comment saying where
   its number came from; start from 2,000 MB and expect the session to hand you the Deck's readings (row
   P104-M-MEMORY) before you land. Anything the module cannot read (no `/proc/meminfo`, Ollama silent) means "do not
   warn": it never blocks an answer on a guess. The AI on another machine is never checked.
2. In `run_ask_ollama`, between the two existing refusals and the summing-up: when the check says "short" and the
   one-shot "anyway" is not armed, return the same shape those refusals use, with a warning in plain words: how much
   is free, how much the AI needs, what helps (close the game; pick a smaller model on the Ollama tab; use the AI on a
   PC), and that asking anyway may freeze the Deck. Write the numbers into the turn's diagnostics and one log line.
3. **"Ask anyway".** A row under the warning, built the way the "Open the Ollama tab" row is (the same component, a
   second kind chosen by the reply's opening words). Pressing it arms a one-shot through one new small plugin method
   (name it with the words the Ollama methods use; it takes nothing and returns nothing that matters; the mark lives
   in the plugin's memory, lasts 60 seconds and is used up by the next ask), then sends the same question again
   through the ordinary path. Do not add an argument to the ask call and do not touch the request file (rule 26).
4. The background summing-up asks the same question at its start and, when memory is short, does nothing this time
   and logs one line. One call at the top of the job; the rest of that file is lane B2's.
5. Not covered, and say so in the module's header: the small meaning-search model the notes search loads before the
   ask (about 0.3 GB).

**The row is a D-pad stop.** It reuses a stop the answer screen already has, so no new chain is built; still follow
rule 24, and test the walk both in focus and out (`src/test-harness/transcriptPanelWalk.tsx`): Down from the warning
reaches the row, A sends, B does nothing surprising. **Files owned:** the new module; that stretch of
`ollama_ask_service.py`; the one new method in `main.py`; one line in `chat_sum_up_job.py`; `noAiSetUpNotice.ts` or a
sibling beside it, `ChatTranscriptHintRows.tsx`, and one call site in `MainTabChatTranscript.tsx` (lane F1 is cut after
you land); the tests. **The test at the Deck's level:** through `run_ask_ollama` with memory and Ollama stood in: short
and not loaded gives the warning and no model call; already loaded gives an answer; armed gives an answer once and the
next ask warns again; the AI on a PC is never checked; an unreadable `/proc/meminfo` never warns.
**The Deck checks (block D1):** P104-MEMORY-01: a heavy game running (the AI unloaded first, nothing asked until the
game has been up a minute): one question gets the warning; `/api/ps` stays empty; available memory does not drop; the
ring reaches "Ask anyway"; **it is not pressed.** P104-MEMORY-02: a light game: no warning, an ordinary answer.
"Ask anyway" itself is pressed once with a light game and the limit raised for the test through the Developer tab or
an environment switch you provide, and say how in your report.

## F1 — The answer screen's D-pad (★★, ★, ★ `[focus]` `[ui]`, Opus extra-high; cut after G1 lands, with block D0's readings in your task)

**Part 1: the ring above the pane after reopening Show details.**
*Seen on the Deck 2026-11-10* (`workshop:test-evidence/plan103-P103-DETAILS-STRIP-01.json`, `-try2.json`): close Show
details with B, reopen with A, with the Session tab showing: the "Hide details" line holding the ring ends up above the
visible pane (its top at -22 in one run and -39 against a pane top of 52 in the other); 4 of 6 tries; never with "This
answer" showing; the page had focus every time.
*Read in the code.* A on the line only flips the open state (`MainTabChatTranscript.tsx`, about lines 476 to 482); B's
path puts the ring back on the line (`closeDetailsPanel` and `focusReplyShowDetails`,
`src/features/answer/details/buildDetailsPanelElement.tsx`, about 135 to 143). When the panel opens, `revealWhenOpened`
(about 154 to 160; wired about 268 and 294) calls `revealBelowKeeping(panel, uiGamepadFocusElement())`
(`src/shared/dpad/chatPanelScroll.ts`, about 155 to 174). That scrolls by the smallest of three limits: clear the
dock; keep the panel's own top in the pane; keep the ring's element in the pane. The third is skipped when the ring's
element is null, is the panel itself, or is outside the pane. With a tall Session panel the second limit is large, so
if the third is skipped the line above the panel leaves the top. The arithmetic of the first run fits that (the scroll
went from 410 to 715 and the line from 282 to about -22).
*Not settled by reading; block D0 measures it (P104-M-REOPEN):* what `uiGamepadFocusElement()` returns at the instant
the panel reopens. Build from the reading. The likely shape is to hold the scroll back by the line that opened the
panel, which is known without asking where the ring is; if the reading says otherwise, follow the reading.

**Part 2: the "notes were used" line behind the dock.**
*Seen 2026-11-10* (`workshop:test-evidence/plan103-P103-COVERED-NOTES-01.json`): with the ring on "Show details" the
line sat at y 360 to 390, behind the dock; with the ring on the question box it showed. *Read in the code.* The line is
a plain element with no stop, on purpose (`buildKbNotesCoveredCaption`,
`src/features/knowledge-library/buildKbNotesBlockElement.tsx`, about lines 252 to 273), drawn directly under the
"Show details" line. Only the focused element is lifted clear of the dock (`liftAboveDock`,
`src/shared/dpad/useDockClearanceOnFocus.ts`, about 59 to 122). *Build.* When the lifted control has that line directly
under it, the lift leaves room for it. The line stays a plain element.

**Part 3: a Steam stop for the summed-up note.**
*Read in the code.* `src/features/chats/sum-up/buildChatSummaryNoteElement.tsx` (about lines 107 to 154): the note is a
Focusable the plugin knows as the reply stop "summary-note" (about 134), but it has no nav reference (about 139 to
148), so Steam has no stop for it and only a plain focus reaches it. With the panel's page out of focus, three paths
claim a press that moves nothing: Down from the answer's last paragraph
(`src/features/answer/bubble/buildAnswerBubbleElement.tsx`, about 309), Up from the first choice button
(`MainTabChatTranscript.tsx`, about 960), Up from "Mark reply helpful" (`moveUpFromReply`,
`src/features/answer/reply-actions/buildReplyActionsElement.tsx`, about 463). Wave six's new paths skip the note in
that state (`src/shared/dpad/liveTurnFocusGraph.ts`, about 411 to 413). *Build.* Give the note its own Steam stop the
way the notes line has one (`registerRowNav`, `buildKbNotesBlockElement.tsx`, about 320 to 335 and 425 to 437;
`src/shared/dpad/focusPerTurnRow.ts`) or the way "Show details" does (`replyStopNavRef`, about line 841 of the reply
actions file); then the three paths land on it in both focus states and the skip added in wave six can go.

**Tests, for all three parts:** the walks with Steam's scroll modelled, each also with the page reporting no focus
(`src/test-harness/transcriptPanelWalk.tsx` models lost focus; `deckAnswerWalk.ts` models the pane, the dock and the
lift but not lost focus: say what each of your tests can and cannot prove), bounded, no stop twice, every stop hears A
and B. `revealOpenedDetails.test.tsx` gains the case block D0 measured. **Files owned:** the reply actions file, the
details panel file, `chatPanelScroll.ts`, `useDockClearanceOnFocus.ts`, `liveTurnFocusGraph.ts`, the summed-up note
file, the notes line builder, the answer bubble file's one call, call sites in the transcript file, their tests and the
harness. The second opinion reads your change before it lands. **The Deck checks (block D2):** P104-DETAILS-REOPEN-01
(B then A on the Session tab, six tries, with and without a light game: the line with the ring is inside the pane
every time); P104-COVERED-CAPTION-01 (ring on "Show details" under a fully hidden answer: the line is above the dock);
P104-SUMMARY-NOTE-STOP-01 (in a summed-up chat: Down from the answer and Up from "Mark reply helpful" land on the
note; A and B are heard).

## F2 — The Session tab's "What the AI remembers" card fits (★ `[ui]`, Opus extra-high; with block D0's reading)

*Seen 2026-11-10* (`workshop:test-evidence/plan103-P103-DETAILS-STRIP-01.json`; `plan103-P103-D2-SWEEP.json`): the
card is 669 px tall, 25 to 50 percent of it visible, and the next Down went on to Rename, so its lower half may not be
reachable at all. *Read in the code.* `src/features/chats/sum-up/SessionSumUpSection.tsx` (about lines 218 to 249):
one list item per line of the summary (`chatSumUpModel.ts`, about 107 to 118); the style rules
(`src/styles/sections/section-6.ts`, about 704 to 744) set no height limit; the text may be 2,000 characters; on focus
only its top is kept in view (about 234). *Build (plan 104 § 2, call 31; if your task says the maintainer picked the
other look, "about ten lines and a Show all button", build that instead and say so).* The card gets a height that fits between the pane's top and the
dock on both screens, and its text scrolls inside it with Down and Up, with a "More below" line while there is more,
the way the shared two-button box does since wave six (`src/shared/TwoButtonConfirmModal.tsx`); state the fit as
arithmetic (`src/test-harness/deckPopupFit.ts` is the pattern; never a height written as a share of the screen). Down
at the end of the text leaves the card. Block D0's row P104-M-SESSION-CARD gives the card's real size and whether the
lower half could be reached. **Files owned:** the Session section, its style rules, its tests. **The Deck check
(P104-SESSION-CARD-01, block D2):** with the long test chat's summary showing: the whole card is above the dock; Down
reads to the end and then moves on to Rename; a picture for the checks page.

## C2 — Chips keep the closest notes in front (★★★ `[KB]` `[chips]`, Sonnet high)

**What a player sees today.** After an answer the back end sends the game's chips closest-first, and the screen then
mostly ignores the order: on the Deck a chip about the boss just asked about turned up twelve seconds later
(`workshop:test-evidence/plan103-P103-CHIP-ORDER-01.json`).

**Read in the code.** The back end returns up to ten game chips, closest to the last question first
(`py_modules/backend/knowledge/knowledge_base_chips.py`, about lines 350 to 406; the kept question lives ten minutes
and is used once, about 109). On the screen, `composeSessionPresets`
(`src/features/preset-carousel/sessionRagComposer.ts`, about 92 to 156) gives each of three opening seeds a 30 percent
roll to take the next game chip, so the closest chip leads only by luck; after that `chooseNextChip`
(`nextChipRule.ts`, about 72 to 143) picks a random game chip that has not been shown this round (`pick`, about 118 to
126). The reseed after an answer is forced (`src/features/ask/useBonsaiAskOrchestration.ts`, about 752).

**Build (plan 104 § 2, call 22).** After an answer that came with a closest-first list: the two chips on screen are
the two closest; each spot's next two picks are the next closest not yet shown; then the usual rule takes over. At
every other time nothing changes. The chips' pace and looks are untouched; a pinned test batch still wins over
everything; spoiler-kind chips come forward only as the back end already decides. Tell the difference between "a list
ordered by the last question" and an ordinary list with a field the back end already sends or one small new one, not
by guessing. The random source stays a parameter so the tests are exact. **Files owned:** the files under
`src/features/preset-carousel/`, their tests; `knowledge_base_chips.py` only if a field is needed, with its test.
**The test at the Deck's level:** with a closest-first list of six and a fixed random source, the first six chips
shown across the two spots are the list's first six in order; with an ordinary list the picks are as today's tests
pin them. **The Deck check (P104-CHIPS-CLOSEST-01, block D2):** Strategy, a light game running, a question about a
named boss: within five seconds of the answer both chips are about that boss or the notes next to it; a recording for
the checks page. Row P103-CHIP-ORDER-01 closes on it.

## B1 — First start: "Install Ollama" no longer blames Internet downloads when they are on (★★ `[ollama]` `[perms]`, Sonnet high)

**What the maintainer saw 2026-11-11.** On the first-start run they switched every permission on, pressed Install
Ollama, and it failed with a message to turn on Internet downloads. No evidence file exists. That same day the back
end was crashing 41 seconds after load (fixed in `d58e3155`).

**Read in the code.** The press checks a copy of the permission held on the screen side: `runLocalSetupInPlace`
(`src/features/ai-connection/useLocalOllamaSetupFlow.tsx`, about lines 139 and 150) calls `internetDownloadsAreOff()`
(`src/features/downloads/downloadNotice.tsx`, about 111 to 118), fed from the screen's settings state. The back end
refuses a download by reading the file on disk (`py_modules/backend/ollama/ollama_local_setup_rpc.py`, about 110).
Three ways the two can disagree, all in `src/features/settings/usePluginSettings.ts`: if the first load of settings
fails, the screen shows defaults and turns saving off (about 494 to 517; saves skipped about 533 and 454); after a
session rebuild, the value on screen becomes the "already saved" baseline, so a lost save is never sent again (about
483 to 486 and 359 to 366; the comment at about 413 admits it); and `turnOnDownloads` swallows a failed save
(`downloadNotice.tsx`, about 156 to 158). The likeliest story: the back end was down, the screen showed the switches
on, the save never reached disk, and the press reached a back end whose file said off.

**Build, one commit each, the failing test first.**
1. A save that fails is not forgotten: the next successful contact with the back end sends what the screen shows.
2. `turnOnDownloads` reports a failed save to its caller, and the message a person reads says the setting could not
   be saved, not that downloads are off.
3. When the back end refuses with "downloads off" while the screen believes they are on, the screen sends its value
   once and tries once more, and only then shows a failure.

Settings plumbing is where a two-language edit goes wrong: read AGENTS.md, "Settings", first, and add no new setting.
**Files owned:** `usePluginSettings.ts`, `downloadNotice.tsx`, `useLocalOllamaSetupFlow.tsx`, their tests; the back
end only if a test proves it needs it (then stop and say which file). **The test at the Deck's level:** with the
back-end call stood in to fail once: turn downloads on, press Install: the press goes through, or the message names
the failed save. **The Deck check (P104-FIRST-RUN-01, block D2, staged; plan 104 § 2, call 23):** the settings file
moved aside, the plugin reloaded: on the first-start box, permissions on, Install Ollama: no "turn on Internet
downloads" message. Everything put back in the same block.

## B2 — A long chat that gets no new summary says so in the log (★ `[chat]`, Sonnet medium; half an hour; after G1 lands and block D0 has read the log)

*Seen 2026-11-10* (`workshop:test-evidence/plan103-P103-SUMUP-01.json`, `-try2.json`): the long test chat was not
summed up, and neither the screen nor the log gave a reason, though wave six had added a reason for a summing-up that
fails (`py_modules/backend/chats/chat_summary_service.py`, `chat_summary_failure.py`).
*Read since, by the plan 105 planning chat's lookup (its plan, § 2, call 22):* no fault. No summary was due: the saved
one already covered 158 turns, and the path that decides "nothing to do" writes nothing. Block D0's row
P104-M-SUMUP-LOG gives you the log around one fresh question in that chat. **First confirm that reading against the
code and that log.** *Build, if it holds:* the "nothing to do" path writes one log line saying no summary was due and
how many turns the saved one covers. Nothing changes on screen. *If it does not hold* (a summary was due and none was
made): stop and report what the log shows; the session cuts a judgment lane for it. The second half of the roadmap
entry (the "summed itself up before this answer" row sitting under its answer) is on purpose and stays: report where
it is placed, and change nothing. **Files owned:** the chat summary files and their tests, except the one line lane
G1 added at the top of `chat_sum_up_job.py`. **The Deck check (P104-SUMUP-02, block D2):** one question in the long
test chat: the log says a summary was made, or says none was due.

---

## L1 — Load-order data for Fallout 4 and Skyrim (★★★ `[KB]`, Sonnet high)

**What this is.** LOOT, the load-order tool, publishes its rule lists under CC0 (no conditions). Plan 101's research
(`workshop:planning/assets/101-mod-knowledge-sources.md`, lines 26 to 37, 64 to 74 and 137 to 171) read them: the
repositories `loot/fallout4`, `loot/skyrimse` and `loot/prelude` on GitHub; the commits it read (Fallout 4
`4c7858a84bc6`, 2026-11-01; Skyrim Special Edition `f37b59d04fb2`, 2026-10-31); 464 and 1,243 entries that carry a
rule; and the shape to keep per entry: `{name, isPattern, group?, after[], requires[], incompatible[],
messages[{type, text, subs, condition}]}` plus the group list, English messages only, no links, no file fingerprints,
no "dirty edit" notes. Read that file first. **Nexus Mods is never read or copied, by hand or by script.**

**Read in the code.** The glossary is the precedent for a table that is not notes: its own table
(`py_modules/backend/knowledge/knowledge_base_schema.py`, about lines 189 to 200: "nothing searches it"; the schema
version stays 4 on purpose, and a library built before the table existed simply lacks it), built by
`scripts/kb/build_rag_db.py` (about 463 to 605, with row checks that stop the build) with a count in the manifest
(about 1045). The build's credits file already has a section for no-conditions sources (about 256 to 285) and
`scripts/kb/publish_corpus.py` accepts `CC0-1.0` (about 68 to 71).

**Build.**
1. A maintainer tool, `scripts/kb/fetch_loot_masterlist.py`: fetches the two games' lists (and the prelude they
   include) from GitHub at a named commit, keeps the entries that carry a rule in the shape above, and writes
   `data/kb/load_order/fallout4.json` and `skyrimse.json`, each with a header (the repository, the commit, its date,
   "CC0-1.0", the date read). Use the commits named above unless newer ones read cleanly; say which you used. If this
   PC's Python has no YAML reader, say so and stop: do not write a parser by hand, and install nothing (rule 2).
2. In the library builder: a table for these rules, created with "if not exists", filled from that folder with row
   checks, a count in the manifest, and the credits entry. The schema version does not change. A build with the
   folder missing still works and has no such table.
3. A reader in the back end (a new file; its public names carry `rag_corpus`): given a game and a mod's file name or
   plain name, return its entry or nothing; a library without the table returns nothing and raises nothing; names
   compared without case, extension, spaces or underscores, and a pattern entry matched as a pattern. It opens the
   library the way the per-thread readers do since `d58e3155` (`knowledge_base_cards.py`), never a shared connection.
4. A script on this PC, `scripts/kb/check_load_order.py`: given a game and a `plugins.txt`, prints what the data says
   in the words plan 101 chose ("X needs Y, which I could not find"; "X and Z are marked as not working together and
   both are on"; "X is told to load after Y but loads before it"), each under "LOOT's list of <date> says", and how
   many rules it could not check (those with a condition it does not read). Never a verdict; never "safe"; never
   "these work together".

**Files owned:** the two new scripts, `data/kb/load_order/`, the builder (one new table and its count),
`knowledge_base_schema.py`, the new reader, their tests, the publish check only if a test proves it needs a line.
**The test at the Deck's level:** none on the Deck this wave (nothing on screen changes). On this PC: a library built
with the folder has the table and the count; a library built without it opens and every existing test passes; the
reader finds three entries you name by plain name and by file name; the checker prints the three kinds of finding on
a sample `plugins.txt` you write. The licence reviewer and the security reviewer read it before it lands. Report the
library's size before and after.

## L2 — A typed question finds a mod's rule, on trial (★★★ `[KB]`, Sonnet high; after L1 has landed and R1 has landed or been turned down)

**Build (the maintainer's call 10).** Behind one switch: when the running game, or the game the question names, is
Fallout 4 or Skyrim Special Edition, and the question names a mod that lane L1's reader finds, that mod's entry is
attached to the turn as its own short block, beside any notes, in fixed words built by code, not by the AI: "LOOT's
list of <date> says: <mod> needs <...>; loads after <...>; is marked as not working with <...>", only the parts the
entry has, and a last line "bonsAI has not checked your own load order." Finding the mod in the question: by the
reader's own name matching against the words of the question, longest name first; a mod named by two or more words is
matched on all of them; a single common word never matches by itself (say what your rule is). One call site, in the
service file's retrieve path, in a new module of yours. The words the AI is given about this block: one sentence, in
your module, not in the prompt file: repeat what the block says and add no judgment about whether mods are safe or
work together.

**Measure** on lane Q3's file (twelve questions naming a mod, four naming none; the session hands it to you only when
your build is done, and you do not edit it): the right entry attached; a wrong entry attached; nothing attached; and,
over twenty answers from the answer test's runner, any sentence saying two mods work together or that a mod is safe
(read them yourself). **The landing rule:** switched on only if the right entry is attached for at least 9 of the 10
mods the data holds (a mod of Q3's that the data does not hold is reported, not counted), none of the four no-mod
questions attaches one, and no answer makes such a claim. Otherwise it lands switched off with the numbers (rule 20).
**Files owned:** the new module, one call site in the service file, their tests. The licence reviewer reads the
wording and the security reviewer the path before it lands. **The Deck check (P104-MODS-LOOKUP-01, block D3, only if
it lands switched on):** Skyrim named in the question, nothing running: two questions that each name a mod attach its
block (a picture of each); a question naming no mod attaches none.

---

## M — A correction or a bug found on the way (template)

One section per item, written by the session: what a player sees (from the evidence file or a lane's report), where it
comes from (the file and line the session read), the one change to build, the files owned, the test at the Deck's
level, and the row (`P104-M<n>-<NAME>`). Sonnet high when the fix needs a judgment, Sonnet medium when the cause is
known and there is one obvious way; about an hour each; a bug that resists is written up and left open. A D-pad or
layout item waits for a Deck measurement and goes to Opus. Corrections to older notes go to one helper at a time when
they share a file.

---

## Appendix — Who owns which notes file this session

| File under `data/kb/` | Lane |
|---|---|
| `strategy_seed.json` | M1, then M2 |
| `notes/half-life-2.json` (new), `NOTICE.md` | N1 |
| `notes/black-mesa.json` (new) | N2 |
| `notes/left-4-dead-2-versus.json` | V5 |
| `notes/left-4-dead-2.json`, `fallout-new-vegas.json`, `palworld.json`, `mario-party-7.json`, `brotato.json` | M1 |
| `notes/grand-theft-auto-iii.json`, `mario-party.json`, `mario-party-2.json`, `mario-party-3.json`, `mario-party-6.json` | W1 |
| `notes/the-sims-4.json`, `gta-san-andreas.json`, `portal-2.json`, `baldurs-gate-3.json` | S1 |
| `notes/grand-theft-auto-iv.json`, `grand-theft-auto-v.json`, `doom-64.json` | S2 |
| `notes/pikmin-2.json`, `donkey-kong-64.json` | S3 |
| `notes/super-mario-64.json`, `mario-kart-64.json`, `paper-mario-the-thousand-year-door.json` | S4 |
| `load_order/` (new) | L1 |
| every other notes file | nobody this session |
