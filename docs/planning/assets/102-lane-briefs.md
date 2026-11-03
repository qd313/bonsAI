# Plan 102: the briefs, one per helper

How a brief is assembled: the session hands each helper `102-helper-rules.md`, the section below with its letter, the
tip hash, the absolute path of its copy, and the plan number (102). Nothing else is needed. A section says: what a
player sees today, where it comes from (files and the reading behind it), what to build, the files owned, the test at
the Deck's level, and the Deck check that proves it (the row). Evidence files are named `plan102-<ROW>.json` by the
driver, never by a helper. Line numbers are as read at tip `84e0e64c` on 2026-11-02 by the session and four read-only
lookups, each re-read against the code; a lane that finds a line has moved re-greps and says so in its report.

Model and effort per lane are in the plan's § 5. A lane that finds its brief wrong says so and stops rather than
building the brief's mistake.

---

## K0 — The bookkeeper's pre-go audit (★ docs, Sonnet medium; the same brief again as K9 at the end)

**What this is.** The knowledge-base roadmap must be right before the first lane starts. Two claims in it do not match
the data or the measurements, and six calls in "Calls waiting on you" are answered by plan 102 § 2 (decision D139).
Fix the words in one commit; move only what a closed call moves; invent no result.

**Fix, each named in your report:**
1. `docs/roadmap-kb.md`, "Where things stand": the build on this PC is 465 notes and 166 tips, unpublished (the
   maintainer's publish is owed; the download sites still serve 2026.10.25). The sentence "29 of 38 games now have
   enemy and item notes" is wrong by the data (counted 2026-11-02 from `data/kb/strategy_seed.json` and the four files
   under `data/kb/notes/`): every one of the 38 games has at least one note of the enemy or item kind, but only seven
   (Deep Rock Galactic: Survivor, The Legend of Zelda: Ocarina of Time, State of Emergency, Baldur's Gate 3, Grand Theft
   Auto: San Andreas, The Sims 4, Portal 2) have enemy or item cards in the labelled short-line shape, and eleven games
   have no enemy note and one item note at most (Grand Theft Auto V, Grand Theft Auto IV, Super Mario 64, Paper Mario:
   The Thousand-Year Door, Pikmin 2, Doom 64, Donkey Kong 64, Mario Kart 64, Mario Party 1, 2, 3, 6 and 7, Yoshi's
   Story, Diddy Kong Racing, Super Smash Bros., Grand Theft Auto III: the first eight are this plan's lanes N5 to N12).
   Reword to that, in one or two sentences. The same sentence appears in the "RAG Phase 5" entry in Next; reword it there.
2. The ★★★★ Bugs entry "What ships loses to its own meaning half": it says nothing has been re-measured on the bigger
   library. It has: plan 100's lane X, 2026-10-25, on the 465-note library, held-back questions, the right note in the
   first three: the shipping blend 90.8 in a hundred, meaning-only 89.0, keyword 81.8
   (`workshop:archive/research/kb-embed-bakeoff-2026-10-25-p100-after-arms.md`; confirm the file exists). Add one
   dated sentence with those numbers; the status word stays ACCEPTED; say "the maintainer decides whether the entry
   stays" nowhere (D82 is open and stays open).
3. The ★★ Bugs entry "Unrelated questions can still get a game card stapled on": its Deck line points at "the
   junk-phrase entry in Deck check owed"; that entry is in Done since 2026-10-26 (row P100-THANKS-01-try2,
   `workshop:test-evidence/plan100-P100-THANKS-01-try2.json`). Point the line at the Done entry instead.
4. The calls answered by D139 (plan 102 § 2, calls 3 and 4; the session confirms the maintainer's answers in your
   task): with the default answers, the four "Calls waiting on you" lines for Hide more against Default, Hide less, the
   three weak notes and the category card (D41) are removed, and their Bugs entries close: each moves to Done in
   `docs/roadmap.md`'s knowledge-base Done list as one line that carries its final numbers and "closed by the
   maintainer, D139, 2026-11-02"; the full entry moves to the roadmap's completed archive file. The D41 entry in the
   decisions file gets a one-line closing note under its heading. The "If you want to cheat" entry moves to
   `docs/roadmap-shelved.md` as a watched sighting (0 in 2 since). If the maintainer's answers differ, your task says
   so; move nothing the answers do not move.
5. Append decision **D139** to `docs/audit/maintainer-decisions-locked.md` in the house shape of D137: the heading
   "D139 — LOCKED 2026-11-02 (raised 2026-11-02) — Plan 102, the knowledge-base wave five: the fourteen calls", then
   plan 102 § 2 word for word with the maintainer's answers written in (your task names them) and the usage figures
   (4 percent of the five-hour window and 3 percent of the week at go). Check 139 is free first; D138 is reserved by
   plan 101's asset file and must not be taken.
6. `docs/testing.md`: one row, status open, for every check in plan 102 § 6 (P102-R0-SETUP, P102-R0-SMOKE,
   P100-NEEDS-01-try3, P100-HIDE-MORE-SCREEN-01-try2, P98-ROUTE-01-try3, P98-DEMOTE-01-game-try2, STRAT-SPOIL-NAME-01 as
   it stands, P102-UNDO-FOCUS-01, P102-SIMS-FIRE-01, P102-FINDPC-01, P102-THIN-GAMES-01, P102-PICTURE-01 (conditional),
   QA-LOOK-01-p102, P102-R1-SWEEP, P102-RR-RESTORE), each saying what it needs and what a pass is, in the shape of the
   plan 100 rows beside them. If the file is at its size ceiling, move the oldest closed rows to the archive first, as
   plan 100's sweep did.
7. Every entry you touched: the status word agrees with its newest dated note; five lines at most (move older dated
   notes to `docs/roadmap-kb-details.md` under a "Plan 102 notes moved" heading and link them); every link resolves.

**Files owned:** `docs/roadmap-kb.md`, `docs/roadmap-kb-details.md`, `docs/roadmap.md` and its completed archive (item
4 only), `docs/roadmap-shelved.md` (item 4 only), `docs/testing.md` (item 6), `docs/audit/maintainer-decisions-locked.md`.
End with `python scripts/docs_toc.py` if a heading changed, then `python scripts/verify.py --quick`. Commit when told.

---

## A — The search-test script honours its no-report flag for the JSON too (★ `[KB]` `[QA]`, Haiku high, trial)

**What this is.** `scripts/kb/eval_kb_embed_models.py` writes two report files into the workshop's research folder
(`research_dir`, set at line 1702 from the workshop helper): the JSON at lines 1847 (the name, `kb-embed-bakeoff-<date>`
plus `-arms` for an arms-only run) and 1869 to 1870 (the write), and the markdown at 1872 to 1875. The flag
`--no-write-report` (lines 1892 to 1893; `--write-report` is the default) gates only the markdown. On 2026-10-25 a
helper's run overwrote the session's dated JSON report that way.

**Build, one commit.** With `write_report` false, neither file is written: the JSON write at 1869 to 1870 moves under
the same condition as the markdown, the payload's `json_path` entry (line 1866) becomes an empty string, and the console
line at 1877 says the report was not written because of the flag. Nothing else changes; an arms-only run with the flag
on still writes both files with the `-arms` suffix. **Test, first:** in `tests/test_eval_kb_arms.py` (the file that pins
this script's honesty rules), one test that points the research folder at a temporary folder, runs the function that
holds lines 1702 to 1880 with the flag off and a stand-in for the model calls (copy the stand-in shape the file already
uses), and asserts the folder stays empty; a second assertion that with the flag on both files appear. If the function
cannot be run that way without the model, say so and test the smallest piece that can be (the write step factored into a
helper of its own is allowed, in the same commit).

**Files owned:** `scripts/kb/eval_kb_embed_models.py`, `tests/test_eval_kb_arms.py`.

**The test at the Deck's level:** none (a PC script). The check is the test above; also run the script once by hand in
your copy with `--arms-only --no-write-report` and confirm the research folder gained no file (list it before and after
and put both listings in your report; you may need Ollama, which is up on this PC).

---

## B — The Sims 4 "Fires" note agrees with the wiki and cites it (★ `[KB]`, Haiku high, trial)

**What a player sees today.** "The Sims 4: how do I stop a fire" (Deck, 2026-10-26, row P100-FOUR-GAMES-01) attaches the
older note "Fires" first and the newer note "Fire" third, and the two disagree: the older says there are no
firefighters to call; the newer says a smoke alarm brings them.

**Where it comes from.** `data/kb/strategy_seed.json`, section `section_id` 112, `game_id` 10, `section_type`
"mechanic", `name` "Fires", `source_license` "bonsAI-maintainer", no `source_url`. Its card begins "There are no
firefighters to call in The Sims 4." The newer note is section 1200 in `data/kb/notes/the-sims-4.json`, drawn from the
Sims wiki page "Fire" at revision 1237114 (`https://sims.fandom.com/wiki/Fire`, licence CC BY-SA 3.0; the fetcher prints
the licence bare, so plan 100's lane set "CC-BY-SA-3.0" by hand), whose "Weak points" line says a smoke alarm brings
firefighters on its own.

**Build, one commit.** Re-read the page with the fetcher (`python scripts/kb/fetch_wiki_live_pages.py --api
https://sims.fandom.com/api.php --titles "Fire" --out .scratch/wiki`), quote in your report the sentence that says
firefighters come when a smoke alarm sees the fire, and rewrite only the first sentence of section 112 to agree with it
(one plain sentence, the maintainer's voice, for example: firefighters come on their own when a smoke alarm sees the
fire, so a smoke alarm and an extinguisher in the kitchen are the first defence). The rest of the card stays word for
word, including its em dash (a real UTF-8 em dash; a console that shows "?" is lying). Give the section its source:
`source_url` the page, `source_license` "CC-BY-SA-3.0", `source_version` the revision the fetcher printed, and
`crawled_at` today, because the builder requires a date on a cited source. Then build once in your copy
(`python scripts/kb/build_rag_db.py --seed --out .scratch/kb`) and read section 112 back from the built library.

**Files owned:** section 112 of `data/kb/strategy_seed.json` and nothing else in it.

**The test at the Deck's level:** the built library's section 112 reads the new sentence (your report quotes it).
**Deck check (P102-SIMS-FIRE-01, block R1):** with the night's library installed, nothing running, "The Sims 4: how do I
stop a fire" attaches notes that agree with each other about firefighters (the log's attach line and the Show details
chip are read).

---

## C — After Undo the panel wins the window's focus back (★★ `[KB]` focus, Opus 5.5 extra-high; the advisor before landing)

**Measured on the Deck 2026-10-24** (`workshop:test-evidence/plan98-P98-DEMOTE-01-game.json`, Deep Rock Galactic:
Survivor running, Strategy): after a thumbs-down (Not really, Wrong tip, the note), the confirmation line "Marked not
helpful / Undo" showed with Undo holding the ring. A Down walk from Undo ended with the ring on the notes block and Down
dead; the driver read `document.hasFocus()` false. Closing and reopening Quick Access cleared it but emptied the question
box. The same lost-focus family as plan 97's freeze.

**Where it comes from (read 2026-11-02).** The reply row's rows land the ring with their own helper, `landOn` in
`src/features/answer/reply-actions/kbDemoteRows.tsx` lines 186 to 199: Steam's transfer onto the stop's own node
(`nav?.current?.TakeFocus?.(true)`), then a plain `el.focus({ preventScroll: true })`, then a check. It never asks the
panel's window for the browser's focus. The heal plan 97 built is `refocusPanelWindowIfLost` in
`src/shared/dpad/navFocusRegistry.ts` (line 170; `takeNavFocus` calls it at 194; the read it rests on is
`uiWindowMissingFocus` in `src/shared/dpad/uiDocument.ts` line 137). Nine places call the heal today (`git grep -n
refocusPanelWindowIfLost -- src`); none is in the reply-actions folder. The strategy checklist's steps are the shape to
copy: `src/shared/dpad/strategyChecklistNav.ts` line 38 asks the heal once, right before its own transfer. The Undo stop
is built at `kbDemoteRows.tsx` lines 366 to 387 (its Down is `a.downOut`, line 468), which goes to `downFromDemoteRows`
in `buildReplyActionsElement.tsx` lines 598 to 602: `focusRegisteredReplyStop("note-keep")` (`replyStopRegistry.ts`
line 191) or `downPastNoteCard` (`focusRegisteredReplyStop("suggest-tip")` or `downToDetails()`). The evidence says the
ring reached the notes block and died there, so read where that Down lands and whether its hop is a plain focus, a
registered transfer that goes through `takeNavFocus` (healed) or one that calls the node's `TakeFocus` directly (not).

**Build, one fix per commit, the failing test first.** Apply the one fix the evidence supports, following AGENTS.md
"When a focus bug lands": (1) `landOn` asks `refocusPanelWindowIfLost()` once before the transfer, the checklist's
shape; (2) if the notes-block Down (the hop the ring died on) does not pass through `takeNavFocus`, it asks the heal the
same way, once, in the same place every other hop of that stop uses. No sprinkling, no page search, no plain focus
across containers, no `tabindex`. **Test at the Deck's level,** modelled on
`src/features/answer/reasoning/reasoningLine.lostFocus.test.tsx` and `src/shared/dpad/navFocusRegistry.windowFocus.test.ts`
(a stand-in document whose `hasFocus` reads a flag and a window whose `focus` is a spy): with the panel's document
reporting no focus, pressing Undo and then Down asks the window for focus (the spy is called) and the ring reaches the
next stop; with focus present, nothing changes and the existing demote walk tests still pass
(`buildReplyActionsElement.demote.test.tsx`, `useReplyDemote.test.ts`).

**Files owned:** `src/features/answer/reply-actions/kbDemoteRows.tsx`, `buildReplyActionsElement.tsx` (the Down out
of the rows only), `src/shared/dpad/replyStopRegistry.ts` only if the evidence points at its hop, one new test file
beside kbDemoteRows. Report the focus-graph record line the bookkeeper should add to `docs/focus-graph.md` (you do not
edit it).

**Deck check (P102-UNDO-FOCUS-01, block R1):** Deep Rock Galactic: Survivor running, the test chat, Strategy; a boss
question with notes; walk to Not really, A, Wrong tip, A, the note, A; the line "Marked not helpful / Undo" shows with
Undo holding the ring; A on Undo; then Down three times with the ring read after each press: every press moves the
ring to a new stop, the plugin log shows no dead press, and the panel is never closed. The baseline for this row is
P98-DEMOTE-01-game-try2 in block R0 (the same presses before the fix).

---

## D — The picture question's shape, and the picture models (★★ `[KB]` `[QA]` and step 2 of the ★★★★ measurement; Sonnet high)

**What a player sees today.** With a game running and a screenshot attached, "what game is this and where am I" names
another game about half the time. Measured 2026-10-25 by `scripts/kb/eval_screenshot_reading.py` on this PC: with the
game handed over the AI named it 58 and 50 times in a hundred over two runs (75 the day before); the God of War asks
named another game 4 and 6 times in 9. Two runs differ by up to 21 points. The sentence added on 2026-10-25 made no
measurable difference.

**Where it comes from.** `py_modules/backend/ask/ollama_ask_service.py` lines 333 to 336: the user message is the
question's text with the picture as an `images` list on it; the system message is text only; both go to `/api/chat`
(`py_modules/backend/ollama/ollama_urls.py` lines 66 to 68). The running game's name reaches the model only in the
system text: `py_modules/backend/prompts/ollama_prompts.py` lines 410 to 415 (the "currently running game" line) and
484 to 496 (the 2026-10-25 sentence, added only when a game name and a picture are both present). The scoring script
hands the game over in its "known" arm as `app_id` and `app_name` (line 465, positions 4 and 5 of `run_game_ai_request`,
whose signature is `py_modules/backend/ask/game_ai_request.py` lines 200 to 205) and attaches the id to the picture
(line 460). Eleven labelled pictures in `tests/fixtures/screenshot_eval_v0.json` (four Deep Rock Galactic: Survivor,
three God of War, one each Brotato, Hades, Half-Life 2, Black Mesa), files in the workshop's `screenshots/plan98`
folder; the default model is `gemma4:e2b-it-qat`; flags `--model`, `--samples`, `--arms`, `--only`, `--write-report`.
The picture models the Deck offers: `py_modules/backend/ollama/ollama_routing.py` lines 99 to 109 (gemma4:e2b-it-qat,
qwen2.5vl:3b, qwen3.5:4b, llava:7b; the open-weight list adds gemma4:e2b and gemma3:4b). On this PC (read 2026-11-02):
gemma4:e2b-it-qat, qwen3.5:4b, llava:7b, gemma3:4b and gemma4:e4b-it-qat are pulled; qwen2.5vl:3b is not (`ollama pull
qwen2.5vl:3b`, about 3 GB, is allowed; say so in the report).

**Build and measure.** Two shapes, behind one switch read once from the environment (`BONSAI_PICTURE_GAME_IN_QUESTION`,
the way plan 70's follow-up switches were built: a production switch, not a monkeypatch), so the scoring script can set
it per run with a new `--picture-shape today|in-question|in-question-only` flag:
- **S1 "in-question":** when a picture is attached and a game is running, the user message's text begins with one plain
  sentence naming the game ("This screenshot is from <game>.") before the question; the system sentence of 2026-10-25
  stays.
- **S2 "in-question-only":** S1 with the system sentence (lines 484 to 496) left out.
Measure on this PC, `gemma4:e2b-it-qat`, both arms, **6 tries per picture, two runs per shape** (today's shape too, as
the baseline of the night): named the game, named the place, the God of War mix-ups, the time to the first word.
Then **the model sweep** (the roadmap's step 2): today's shape, the known arm, 3 tries, on qwen3.5:4b, llava:7b,
gemma4:e4b-it-qat and, if pulled, qwen2.5vl:3b: the same four figures per model. One eval at a time (the model is one
process shared by other lanes tonight); say how long each run took.

**Landing rule.** A shape lands (its switch flipped to default-on, the flag kept as the off switch) only if it beats
today's shape on "named the game, game handed over" in **both** of its runs and does not raise the God of War mix-ups
in either. Otherwise commit nothing but the scoring script's flag and its test (so the measurement can be re-run), and
say in the report whether the system sentence should stay (plan 102 call 5). The Default spoiler paragraph is pinned
byte for byte (`tests/fixtures/spoiler_default_tier_golden.json`) and must not change; a deliberate change to a
whole-prompt fingerprint is allowed and named in the commit. Report the system prompt's length before and after for a
Strategy turn with a picture.

**Files owned:** `ollama_ask_service.py` (the user message), `ollama_prompts.py` (this lane alone tonight),
`scripts/kb/eval_screenshot_reading.py`, `tests/test_eval_screenshot_reading.py`, `tests/test_ollama_prompts_plan100.py`
(the picture-line test may need to follow the switch), a new `tests/test_ollama_ask_service_picture_shape.py`.

**The test at the Deck's level:** a test builds the messages list for a turn with a picture and a running game and
asserts the user message begins with the game sentence under S1 and not under today's shape; the scoring script's
numbers are the measurement. **Deck check (P102-PICTURE-01, block R1, only if a shape lands):** God of War running, the
newest screenshot attached with the paperclip, "what game is this and where am I": the reply names God of War, two
tries, differently worded.

---

## E — The crowding read (★★ `[KB]`, Sonnet high; commits nothing)

**What this is.** After plan 100's 51 notes landed, the answer test's "facts kept" fell from 76.3 to 67.2 in a hundred
and five held-back search questions lost their note from the first three. Two earlier runs on the old library differed
by up to 6 points, so the drop is not believed until the questions are read; the maintainer asked for that read
("Calls waiting on you"). You do the read and say what it means; the maintainer decides.

**Inputs.** The before report `workshop:archive/research/kb-answer-eval-2026-10-25-p100-default.md` (the published
2026.10.25 library, 414 notes) and the after report `...-p100-needs.md` (the landed library, 465 notes); the six
questions that went from 3 of 3 to 0 of 3: A-P2-01, A-CP77-02, A-FO4-05, A-BG3-01, A-GTAV-01, A-HK-03 (their cases in
`tests/fixtures/kb_answer_eval.json`: `must_mention` is a list of groups, each group one fact's phrasings). The search
side: the per-case tables in `kb-embed-bakeoff-2026-10-25-p100-before-arms.json` and `-after-arms.json`; the five
held-back questions that dropped out of the first three are the Portal 2 gels, the Baldur's Gate 3 class, an audio
tip and two GTA rows (find their ids by diffing the two tables on the blend arm).

**Do.** (1) Run the six cases on today's library (`python scripts/kb/eval_kb_answers.py --only
A-P2-01,A-CP77-02,A-FO4-05,A-BG3-01,A-GTAV-01,A-HK-03 --samples 3 --label p102-crowding-read`; the report lands in the
workshop's research folder, which is allowed for a measurement lane). (2) For each of the six, read the three replies
against the card the case names and against the notes that attached, and give one verdict: **a worse answer** (the
reply lost a fact the attached notes carry), **a stale expectation** (a newer, more specific note now attaches and the
test still wants the old card's words; A-P2-01 looks like one: the three gel notes attach and the test wants "orange"),
or **noise** (the fact comes and goes across samples). (3) For each of the five search questions, name the notes that
took the slots and the words they share with the question, and say whether the new note is the better answer for a
player who typed that question. (4) Propose the fixture edits that follow (a case's `expect_card` or `must_mention`
widened to the new notes' words where the new note is right; nothing where the answer is worse), as a patch file
beside the report, not applied.

**Report:** `workshop:archive/research/kb-crowding-read-2026-11-02-p102.md` with one table (case, cards attached before
and after, facts missed, verdict, proposed edit) and the patch `kb-answer-eval-fixture-p102-proposed.patch` beside it;
the numbers and the verdicts in your report. Nothing committed; no file in the repo changed.

---

## F — Deeper answer checks (★★★ `[KB]`, Sonnet high)

**What this is.** The answer test (`scripts/kb/eval_kb_answers.py`) measures what the Deck's model writes from the
cards, but it cannot tell whether the model admitted not knowing when no card could answer. The roadmap has carried
this since 2026-09-05. One sighting: a plain tip became advice that contradicted itself.

**Where it comes from.** One case's expectations are the `Case` class, lines 378 to 391 (`must_mention` 386,
`must_not_say` 387, `expect_fence` 388, `expect_branches` 389, `expect_attached` 390); the fixture loads into it at 408
to 430; one reply is scored by `run_turn`, lines 788 to 874 (the attach check at 862 to 864). The summary counters are
the `Summary` class, 1238 to 1268, filled by `summarize`, 1270 to 1303; the summary table rows are written at 1406 to
1417 (the "Control: nothing attached" row at 1415 reads n/a because the only case with `expect_attached`, A-NOCARD-01,
leaves it null: Strategy mode attaches a genre fallback card by design, so "nothing attached" is the wrong expectation
there); the per-case table's header is at 1445, the divider 1446, a row 1452 to 1464; the saved JSON at 1864. The
fixture `tests/fixtures/kb_answer_eval.json`: 63 cases and 8 follow-up pairs; A-NOCARD-01 at lines 950 to 962
(ELDEN RING, Strategy) and A-VAGUE-01 at 964 to 975 are the two no-card cases; no key names an expected "I don't
know" wording. The reply's honest lines are written by the back end: "Not in my notes — this answer is from the model's
own knowledge." (`py_modules/backend/knowledge/kb_not_in_notes_notice.py` line 29) and "No close match in my notes, this
answer leans on the model's own knowledge." (line 154). The thin-match script already asks about two made-up bosses in
Deep Rock Galactic: Survivor (`scripts/measure_kb_thin_match.py` lines 173 to 174: Zorblax, Grimthak). Tests:
`tests/test_eval_kb_answers.py` (classes at lines 34, 543, 637, 979: wording and claim matching, judge parsing, the
harness, a prompt variant, follow-up pairs; nothing on the control row or the report writer).

**Build, four commits.**
1. The case shape gains one optional field, `expect_unknown` (true: no note can answer this; the reply should say so).
   The scorer gains two checks for such a case: **admitted not knowing** (one of the two back-end lines above in the
   reply, or a plain admission such as "I don't know", "I'm not sure", "I don't have notes on", "I can't find", with
   apostrophes dropped the way the script's own `_norm` does) and **answered as if it knew** (not admitted, and the
   reply names the made-up thing with advice around it). Tests for both matchers, both ways.
2. Eight to ten new cases, ids `A-UNKNOWN-01` onward, across the three modes: three made-up bosses in covered games
   (Zorblax and Grimthak in Deep Rock Galactic: Survivor, app 2321470, are two), two real things no note covers (pick
   from a covered game's wiki-known enemies that have no section; say which and why), two unknown games in Speed and in
   Expert (Strategy is excluded: it attaches a genre card by design), one made-up item. Each with `expect_unknown` true,
   `must_mention` empty, `expect_card` null, a `note` saying why no note can answer.
3. Two summary rows after line 1415 ("Admits not knowing", "Answers as if it knew", both over the `expect_unknown`
   cases only), one per-case column, the saved JSON (1864) carries both; a test for the rows.
4. A `--sample-for-reading N` switch: after a run, N replies chosen at random with a fixed seed (question, mode, cards
   attached, the reply in full) are written to the workshop's research folder as `kb-answer-sample-<date><label>.md`
   for the maintainer's monthly read; a test that the file is written with N entries from a stand-in run.

**Files owned:** `scripts/kb/eval_kb_answers.py`, the new cases in `tests/fixtures/kb_answer_eval.json` (nothing else in
it), `tests/test_eval_kb_answers.py`.

**Measured by you on this PC** (Ollama up, the library at `build/knowledge-base`): the new cases, 3 samples
(`--only <the ids> --samples 3 --label p102-unknown`), the two rates in your report, and one `--sample-for-reading 10`
run (its file named in the report). One eval at a time; say how long each took. No Deck row: the answer test is the
check.

---

## G — The card-style measurement (★★★ `[KB]`, Sonnet high; commits nothing)

**What this is.** The roadmap's "Card style pass" says: rewrite the prose cards as labelled short lines only if the
answer test shows the labelled shape scores better. Nothing has measured that. Counted 2026-11-02: 73 of 465 cards use
the labelled shape (lines beginning "Summary:", "Weak points:" or "Uses:", "Tips:"), 392 are prose; of the answer test's
43 cases that name a card the data resolves, 41 point at prose cards and 2 at labelled ones.

**Do.** (1) Pick fifteen prose cards from these candidate cases, each of which kept fewer than 3 of 3 facts on
2026-10-25 (`workshop:archive/research/kb-answer-eval-2026-10-25-p100-needs.md`): A-L4D2-01 (Tank), A-HADES-02 (Theseus
and Asterius), A-CP77-02 (Choosing a build), A-FO4-01 (Deathclaw), A-FO4-05 (Legendary enemies), A-RDR2-01 (Coming from
GTA), A-OOT-02 (Volvagia), A-GTAV-01 (Weapons, armour and cover), A-GTAIV-02 (Starting out in GTA IV), A-FNV-02 (Starting
out in Fallout: New Vegas), A-SM64-01 (Bowser: the three fights), A-MK64-01 (Items and who gets them), A-TTYD-02
(Starting out), A-PIK2-02 (Starting out), A-HK-03 (Soul Master). The emulated games' cases carry no app id and match by
name; resolve each card in `data/kb/strategy_seed.json` by game and name. (2) In your copy, rewrite each of the fifteen
cards in the labelled shape with **no new facts**: the card's own sentences re-arranged under Summary, Weak points (an
enemy or boss) or Uses (an item) or How it works (a mechanic or starting-out note), and Tips; every `must_mention`
group of the case must still have at least one phrasing in the rewritten card (check this with a scratch script before
building). (3) Build that seed to a scratch library (`python scripts/kb/build_rag_db.py --seed --out
.scratch/kb-labelled`), then put the seed back (`git -C <copy> checkout -- data/kb/strategy_seed.json`) after saving
the rewrite as `.scratch/card-style-p102.patch`. (4) Run the answer test on the fifteen cases against both libraries,
3 samples, **two runs each**: `--corpus build/knowledge-base --label p102-style-prose` and `--corpus .scratch/kb-labelled
--label p102-style-labelled`. One eval at a time; say how long each took.

**Report:** per case, facts kept and contradictions, prose against labelled, both runs, and the two totals; the patch
copied to the workshop's research folder as `card-style-rewrites-2026-11-02-p102.patch`. Nothing committed; the seed
in your copy is left as it was.

---

## H — The "can't find my PC" tip (★ `[KB]`, Sonnet medium; call 6)

**What a player sees today.** "cant find my pc on the network" and "it won't show my computer in the list even though
they're both connected to the same home network" (rows `V2-W2-SYM-19` and `-20` of `tests/fixtures/kb_eval_v2.json`)
reach no tip: no tip is about a Deck finding its PC (tips 110 and 111 are Steam Frame tips), and the router has no
rule for the words (`py_modules/backend/knowledge/compat_topic_router.py`, the comment at lines 253 to 255 says so and
why). The two rows carry no `expect_topic` and no `expect_pattern_id`.

**Build, three commits.**
1. Tip 167 in `data/kb/compat_patterns.json` (a list; the last id is 166): topic `network`, platforms `["deck"]`,
   `source_url` empty, `source_license` "bonsAI-maintainer", the card lane T drafted in plan 100 § 14, word for word:
   "Researched, unconfirmed: if the Deck can't find your PC, put both on the same home network. On the PC, Ollama must
   accept connections from other devices and port 11434 must pass the firewall; point bonsAI at the PC address followed
   by :11434." A test in `tests/test_compat_patterns_plain_words.py` that the two sentences' key phrases ("find my pc",
   "same network") appear in tip 167.
2. The router's `network` rules (line 234 onward) gain pairs written as the existing pairs are: ("can't find" or "cant
   find" or "cannot find") with ("pc" or "computer"); "my computer" with "list"; "same network" alone only if the
   existing network rules already accept a lone phrase of that weight, else paired with "pc" or "computer" or "deck".
   The comment at 253 to 255 is replaced by one line saying tip 167 answers these. `tests/test_compat_topic_router.py`:
   the two sentences route to network; "how do I beat the boss", "what should I build first" and "thank you very much"
   still route to nothing; the test at line 301 that reads the whole fixture still passes (so no other question
   changed its route; if it fails, the pair is too loose: tighten it, never the test).
3. The two fixture rows gain `expect_topic` "network" and `expect_pattern_id` 167 and nothing else changes in the file.
   Then run `python scripts/measure_kb_floor_holdout.py --json .scratch/tips-after.json --label p102-H` and put its
   table in your report: 19 of 24 should reach a tip and 17 the right one (17 and 15 today), none a wrong one.

**Files owned:** `data/kb/compat_patterns.json`, `compat_topic_router.py`, `tests/test_compat_topic_router.py`,
`tests/test_compat_patterns_plain_words.py`, rows `V2-W2-SYM-19` and `-20` of `tests/fixtures/kb_eval_v2.json`. Do not
run the search-test script (`eval_kb_embed_models.py`) tonight: it writes into the workshop; lane X2 runs it.

**The test at the Deck's level:** the router test says "cant find my pc on the network" reaches the network topic with
nothing running and with a game running. **Deck check (P102-FINDPC-01, block R1):** nothing running, "cant find my pc on
the network" typed with the send-question script: the answer carries tip 167 (the log's attach line names it); a boss
question attaches no tip.

---

## I — Thirty questions only the meaning search can answer (★★ `[KB]`, Sonnet medium; cut after H lands)

**What this is.** The roadmap's "The eval cannot yet prove the meaning search rescues many questions": only 4 labelled
questions get nothing from the word search, too few to gate a regression. You write thirty more.

**Build, one commit.** Thirty rows appended to `tests/fixtures/kb_eval_v2.json` (670 queries today; the shape of a row
is the first query, `V2-S-L4D2-01`: id, split, domain, app_id, shortcut, query, intent, topic_hint,
withheld_card_terms, skill_level, input_style, note, expect_section; the loader accepts new optional keys, as
`expect_pattern_id` was added in plan 100): ids `V2-P102-MEAN-01` to `-30`, split `holdout`, domain `strategy`, one
note each spread across the games (at most two per game; emulated games carry no app id and are named in `shortcut`
as their existing rows are: copy that shape), `meaning_only` true, `note` "Written 2026-11-02 to measure the meaning
search alone: no content word of the note's name or card", `expect_section` the note's name. **The rule for each
question:** a player's plain words about the note's subject that use **none of the content words** of the note's name
or card (articles, pronouns and the game's own name do not count; a scratch script in `.scratch/` lists each note's
content words from the seed and the notes files, lower-cased, stemmed roughly, and checks every question against them).
Then prove it with the built library: for each row, query the library's word index (the FTS table in
`build/knowledge-base/corpus.db`; read `py_modules/backend/knowledge/knowledge_base_schema.py` for the table and the
indexed columns) with the question's words and assert the right note gets zero word hits; put the thirty results in
your report. Do not read the four existing meaning-only rows for wording; find them by the per-case table if you need
to avoid their notes.

**Files owned:** the new rows of `tests/fixtures/kb_eval_v2.json` only (lane H's two rows and the rest of the file are
not yours). **The test at the Deck's level:** none; lane X2 runs the search test on your rows and counts how many the
blend rescues.

---

## J — Plan 101's research lane: the mod-knowledge sources (★★ `[KB]`, Sonnet high; read-only; the web)

Your brief is section **R** of [101-lane-briefs.md](101-lane-briefs.md), word for word; the plan it belongs to is
[plan 101](../101-deep-mod-ai-hints.md) (§§ 7d, 11 and 12 give the background). Plan 102's rules apply (this file's
rules page); you touch nothing in the repo; your report file goes to the workshop's `planning/assets/` folder as that
brief says. Read the roadmap entry "Mod knowledge for modded games" in `docs/roadmap-kb.md` first; your report ends
with the one next step that entry should name.

---

## N5 to N12 — Enemy and item notes for the eight thin games (★★★★ `[KB]`, Sonnet high, eight lanes; call 2)

**What a player sees today.** "How do I deal with the Thwomps in Mario Kart 64" or "what does body armor do in GTA V"
gets the model's memory, not a note: these eight games have no enemy note and one item note at most (counted
2026-11-02). Their chips have one flavour.

**Where it comes from.** The library builder reads every `*.json` under `data/kb/notes/` after the seed (plan 98 lane
A0): an object with `games`, `aliases` and `sections` lists, merged after the seed; the usual checks run (section ids
unique, a cited source carries `crawled_at`, the "Starting out" naming rule). A section has `section_id`, `game_id`,
`section_type`, `name`, `card`, `source_url`, `source_license`, `source_version`, `crawled_at`. The labelled short-line
shape (plan 100's four files are the models, for example `data/kb/notes/portal-2.json`): `Summary:` one line;
`Weak points:` (enemy) or `Uses:` (item) one line; `Tips:` one or two lines; each line a plain sentence. Read your
game's existing sections in `data/kb/strategy_seed.json` first (by `game_id`) so you add, never repeat.

**The games, their sources (as their notes already cite them; confirm the api path with `--search` first), and their
id ranges.** Every lane's file holds an empty `games` list and an empty `aliases` list.
- **N5, Grand Theft Auto V** (`game_id` 18, app 3240220; a story game: no story character in a note's name unless the
  player fights them). The GTA wiki, `https://gta.fandom.com/api.php`, CC BY-SA 3.0. Enemies: the wanted levels and
  what each star brings, the police and the special units, gang attacks, the wildlife that kills. Items: body armor,
  the weapon classes and where to buy, health and snacks, the special vehicles. File `grand-theft-auto-v.json`, ids
  1400 to 1499.
- **N6, Grand Theft Auto IV** (`game_id` 19, app 12210; a story game, the same rule). The GTA wiki, as above. Enemies:
  the wanted levels and losing them, the police response, gangs. Items: body armor, weapons and where to buy, health,
  taxis and the phone. File `grand-theft-auto-iv.json`, ids 1500 to 1599.
- **N7, Super Mario 64** (`game_id` 21, Nintendo 64, no app id). The Super Mario Wiki, `https://www.mariowiki.com/api.php`,
  CC BY-SA 4.0. Enemies: Big Bob-omb, Whomp King, Chain Chomp, Boo and Big Boo, Bully, Eyerok, Wiggler, Piranha Plant,
  the Bowser fights only where the existing "Bowser: the three fights" note leaves a gap. Items: the Wing, Metal and
  Vanish Caps, Power Stars, red and blue coins, 1-Up Mushrooms. File `super-mario-64.json`, ids 1600 to 1699.
- **N8, Paper Mario: The Thousand-Year Door** (`game_id` 23, GameCube, no app id; a story game, the name rule). The
  Super Mario Wiki, as above. Enemies the player fights (the common ones and the bosses by chapter, Hooktail already
  has a note). Items: badges and BP, the Star Pieces and Shine Sprites, the healing items, partner upgrades. File
  `paper-mario-the-thousand-year-door.json`, ids 1700 to 1799.
- **N9, Pikmin 2** (`game_id` 24, GameCube, no app id). The Pikmin wiki, `https://www.pikminwiki.com/api.php`, CC BY-SA
  4.0. Enemies: Bulborb and Dwarf Bulborb, Fiery Blowhog, Wollywog, Man-at-Legs, Waterwraith, Titan Dweevil (the
  Empress Bulblax and the Snagret have a note). Items: the ultra-spicy and ultra-bitter sprays, nectar, eggs, the
  Pikmin types as tools. File `pikmin-2.json`, ids 1800 to 1899.
- **N10, Doom 64** (`game_id` 17, Nintendo 64, no app id). The Doom Wiki, `https://doomwiki.org/w/api.php` (the api is
  under `/w/`), CC BY-SA 4.0; its pages for this game carry "(Doom 64)" in the title. Enemies: Nightmare Imp, Hell
  Knight, Baron of Hell, Mancubus, Arachnotron, Cacodemon, Pain Elemental, Cyberdemon (the Mother Demon has a note).
  Items: the Unmaker and the three demon keys, the chainsaw, the BFG, the Megasphere. File `doom-64.json`, ids 1900
  to 1999.
- **N11, Donkey Kong 64** (`game_id` 31, Nintendo 64, no app id). The Super Mario Wiki, as above. Enemies: Kritter,
  Klump, Kasplat, Zinger, the bosses (Army Dillo, Dogadon, Mad Jack, Puftoss, King Kut Out). Items: Golden Bananas,
  banana coins, blueprints, the crystal coconuts, each Kong's weapon and instrument, the potions and moves. File
  `donkey-kong-64.json`, ids 2000 to 2099.
- **N12, Mario Kart 64** (`game_id` 22, Nintendo 64, no app id). The Super Mario Wiki, as above. Enemies only where a
  player would ask "how do I deal with": the Thwomps, the train on Kalimari Desert, the Yoshi Valley eggs, Boo. Items:
  Banana and the bunch, Green, Red and Blue Shells, Mushroom and Golden Mushroom, Star, Lightning, Fake Item Box,
  Boo (the "Items and who gets them" note covers the odds; you cover each item's use). File `mario-kart-64.json`, ids
  2100 to 2199.

**Build (content only, one commit per three to five notes).** Ten to fifteen `sections` (fewer if the source runs out;
report the shortfall rather than fill it from memory). `source_url` the page read, `source_license` as the fetcher
printed it (write the versioned form the library already carries for that wiki), `source_version` the revision id,
`crawled_at` today. A sidecar `<file>.sources.json` lists, per `section_id`, the page, the revision and the sentence or
table row each line was drawn from, with the licence header plan 100's FOSS review asked for (copy
`data/kb/notes/gta-san-andreas.sources.json`'s shape). Read every sentence against its page before you report, line by
line, and say so.

**Files owned:** your file and its sidecar only. A schema check script of your own in `.scratch/` (fields present, ids
in range, game id right, no repeats within your file, every section labelled) and one library build in your copy
(`python scripts/kb/build_rag_db.py --seed --out .scratch/kb`).

**The test at the Deck's level:** none in code; the builder's refusal rules and your line-by-line read are the test.
Your report lists every note's name, kind and page, and the list of entity names (names only, bracketed parts kept)
for lane Q2. **Nothing lands before the maintainer has read one game's notes in the chat** (call 2); the session reads
the first finished lane's notes aloud.

**The Deck check (P102-THIN-GAMES-01, block R1):** with the night's library installed, nothing running, one enemy or
item question per game by name attaches a note from the new file; the row passes on six of eight or more and names
the misses.

---

## Q2 — Blind search questions for the new notes (★★ `[KB]`, Sonnet medium; after I lands; from names only)

**What this is.** Whoever writes a note never writes its test question. You get, from lanes N5 to N12 through the
session, the list of new notes as names, kinds and section ids only, never their text, bracketed parts kept. Write two
questions per note the way a player types them (one plain, one terse or misspelled), as rows in
`tests/fixtures/kb_eval_v2.json` after the last row: id `V2-P102-<GAME>-<NN>` (GAME one of GTAV, GTAIV, SM64, TTYD,
PIK2, DOOM64, DK64, MK64), split `holdout`, domain `strategy`, the game's `app_id` or, for the emulated games, the
`shortcut` name as that game's existing rows carry it, `query`, `intent`, `topic_hint` empty, `withheld_card_terms`
empty, `skill_level`, `input_style`, `note` "Written blind 2026-11-02 from the note's name only", `expect_section` the
note's name. Do not read the notes files or the sources sidecars. The fixture's label test reads the notes files (plan
100 lane Q made it so), so every row must name a note that exists.

**Files owned:** the new rows of `tests/fixtures/kb_eval_v2.json` only. **The test at the Deck's level:** none; lane X2
runs the search test on your rows (its item 4).

---

## X2 — The measurements, before and after, on this PC (★★ `[KB]`, Sonnet medium, a long job)

Nothing in the repo changes. Every report file goes to the workshop's research folder with today's date and `p102` in
its name; your report carries the numbers and the exact commands. Ollama is up on this PC; the library at
`build/knowledge-base` has every meaning vector. One eval at a time (the model is one process shared with lanes D, E,
F and G tonight); say how long each took. If time runs out, report what finished.

**The search-test script writes two dated files on every run** (`kb-embed-bakeoff-<date>-arms.json` and `.md`; lane A
is fixing its flag tonight): **rename both at once after each run** with the label (`-p102-before`, `-p102-after`), so a
second run on the same date never overwrites the first, and never delete a file you did not write.

**Before the landings (the first half):**
1. The search fixture baseline: `python scripts/kb/eval_kb_embed_models.py --arms-only --write-report`; keep the
   per-question output; rename as above. Report the held-back figures for the blend, the meaning arm and the word arm
   (90.8, 89.0, 81.8 on 2026-10-25), and the compat lines.
2. The tips reach: `python scripts/measure_kb_floor_holdout.py --json .scratch/tips-before.json --label p102-before`:
   how many of the 24 sentences reach a tip and the right one (17 and 15 on 2026-10-25); the table of 24.
3. The answer test on first turns: `python scripts/kb/eval_kb_answers.py --samples 3 --label p102-before` (facts kept
   read 67.2 on 2026-10-25, contradictions 96.3 clean).

**After the landings (the second half; the session says when, and which lanes landed):**
4. Item 1 again on the landed tip with the new library (`-p102-after`): no right note lost; lane I's thirty
   meaning-only rows: how many the word arm misses and the blend finds in the first three; lane Q2's blind questions:
   found in the first three, how many of how many (first place too).
5. Item 2 again (`-p102-after`): with tip 167, 19 and 17 expected.
6. Item 3 again (`-p102-after`), plus, once lane F has landed, the two new rows ("Admits not knowing", "Answers as if it
   knew") over its new cases.

Table per item: before, after, the report file's name. Nothing is committed by this lane.

---

## M — A bug found tonight (template)

One section per bug, written by the session: what a player sees (from the evidence file), where it comes from (the
file and line the session read), the one change to build, the files owned, the test at the Deck's level, and the row
(`P102-M<n>-<NAME>`). Sonnet high when the fix needs a judgment, Sonnet medium when the cause is known and there is one
obvious way; about an hour each; a bug that resists is written up and left open. The "Needs" clause (call 7) comes
here if its prepared Deck try draws no "Needs" line: one commit in `ollama_prompts.py` removing the clause and
updating the prompt test, after lane D has landed (the two share that file).
