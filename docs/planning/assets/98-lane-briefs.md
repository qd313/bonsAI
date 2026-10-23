# Plan 98: the briefs, one per helper

How a brief is assembled: the session hands each helper `98-helper-rules.md`, the section below with its letter, the
tip hash, the absolute path of its copy, and the plan number (98). Nothing else is needed. A section says: what a
player sees today, where it comes from (files and the reading behind it), what to build, the files owned, the test at
the Deck's level, and the Deck check that proves it (the row). Evidence files are named `plan98-<ROW>.json` by the
driver, never by a helper.

Model and effort per lane are in the plan's § 5. A lane that finds its brief wrong says so and stops rather than
building the brief's mistake.

---

## A0 — The library builder reads folders, and a glossary row may name its game by the library's own id (★, Sonnet medium)

**What a player sees.** Nothing yet. This is the change that lets three glossary lanes and later note lanes write at
once without sharing one file, and lets the eighteen games with no Steam id (the Nintendo titles, State of Emergency)
have tap-to-define words at all.

**Where it comes from.** `scripts/kb/build_rag_db.py`: `_seed_glossary_terms` reads only `data/kb/glossary_terms.json`
and `_glossary_row_problems` accepts a row only when its `app_id` is a Steam id in the `games` table (built from
`SELECT game_id, app_id FROM games WHERE app_id IS NOT NULL`). `_seed_strategy_corpus` reads only
`data/kb/strategy_seed.json`.

**Build, three commits.**
1. The glossary read also takes every `*.json` file under `data/kb/glossary/` (sorted by name), each a list of rows,
   merged after the main file. The repeat checks (term ids, term keys, spellings) run over the merged list, and a
   problem names the file it came from. A missing folder gives no rows, like a missing file does.
2. A glossary row may carry `game_id` (the library's own id from the seed's `games` list) instead of `app_id`. Exactly
   one of the two must name a game the library holds; a row with both must agree, and a row with neither, or an unknown
   id, stops the build with the file and row named. Both directions tested: a good `game_id` row builds, a bad one
   refuses with the right message, an `app_id` row still works.
3. The strategy read also takes every `*.json` file under `data/kb/notes/`, each an object with optional `games`,
   `aliases` and `sections` lists, merged after the seed. The existing checks (section ids unique, a cited source
   carries `crawled_at`, the "Starting out" naming rule) run over the merged lists, naming the file on a problem.

**Files owned:** `scripts/kb/build_rag_db.py`, `tests/test_build_rag_reproducible.py` (a merged build is still
byte-identical across two runs), and a new `tests/test_build_rag_folders.py`. Any other test that reads the seed
directly is left alone and named in the report.

**The test at the Deck's level:** a build with one extra glossary file and one extra notes file yields a library whose
`glossary_terms` table holds the extra word under the right `game_id` and whose `sections` hold the extra note; the
same build twice is byte-identical.

**The Deck check:** none of its own; lanes G and the library install in block K1 prove it.

---

## G1, G2, G3 — Glossary words for every game (★★, Sonnet high, three lanes)

**What a player sees today.** Underlined, tap-to-define words appear only in Deep Rock Galactic: Survivor answers
("kiting", "overclock"): two rows exist in `data/kb/glossary_terms.json`. Every other game shows no underlined words.

**Where it comes from.** The words live in the library's `glossary_terms` table, read by
`py_modules/backend/knowledge/knowledge_base_glossary.py` for the running game, else the game the question names, else
the chat's own game. The screen underlines a word when the AI uses it (`src/features/answer/...`), A opens the peek,
and the full text is one more press. Nothing in code needs to change: new rows and a library rebuild are the whole job.

**Build (content only, one commit per game or per few games).** One new file, `data/kb/glossary/<batch>.json` (G1:
`steam-wiki-titles.json`, G2: `own-and-gta-titles.json`, G3: `nintendo-titles.json`), a list of rows with the seven
fields the existing file uses: `term_id`, `app_id` **or** `game_id` (`game_id` for the games with no Steam id; read the
seed's `games` list for both), `term_key` (lower-case, no spaces), `term` (as a player writes it), `alt_forms` (a list
of other spellings and forms, may be empty), `peek` (one sentence, under 120 characters), `full_text` (two to four
sentences). Six to ten words per game. Term ids: G1 uses 1000 to 1999, G2 2000 to 2999, G3 3000 to 3999.

**What a word is.** Something a player meets in an answer and may not know: a mechanic, a currency, a mode, an enemy
class, a stat, the game's own jargon ("Nitra", "Perk", "Hollow Knight's Soul", "Pikmin's Onion"). Not a character
name from a story-protected game (the glossary is never covered); not a word every player knows ("health").

**Where the words' text comes from.** Only from that game's own notes in `data/kb/strategy_seed.json` (and, for a Deck
term, `data/kb/compat_patterns.json`). The peek and the full text restate what a note says, in plain words; nothing is
added from memory. A sidecar `data/kb/glossary/<batch>.sources.json` lists, per `term_id`, the `section_id`(s) the word
came from. The session spot-checks one word in ten against its note.

**Batches.** G1: Left 4 Dead 2, Fallout 4, Skyrim Special Edition, Black Mesa, Hollow Knight, DOOM Eternal, Cyberpunk
2077, Fallout: New Vegas, Brotato, Palworld, Half-Life 2, Portal 2. G2: Ocarina of Time, Hades, Red Dead Redemption 2,
State of Emergency, GTA San Andreas (Definitive), GTA V, GTA IV, GTA III (Definitive), The Sims 4, Baldur's Gate 3, and
six to eight more words for Deep Rock Galactic: Survivor beyond its two. G3: Pikmin 2, Super Smash Bros. Melee, Super
Smash Bros., Mario Party, Mario Party 2, 3, 6 and 7, Mario Kart 64, Paper Mario: The Thousand-Year Door, Donkey Kong 64,
Super Mario 64, Diddy Kong Racing, Yoshi's Story, Doom 64.

**Files owned:** your batch file and its sidecar only. A schema check script of your own in `.scratch/` (fields present,
ids in range, game known, no repeats within your file).

**The test at the Deck's level:** none in code; the builder's refusal rules are the test. Your report lists, per game,
the words and the note each came from.

**The Deck check (P98-GLOSSARY-02, block K1):** with the new library installed through the Developer tab, a Strategy
question about Hollow Knight by name draws at least one underlined word; A on it opens the peek; B closes it; the saved
walk `P86-GLOSSARY-WALK` replays. Then the same for one G3 game by name.

---

## B — The spoiler tiers setting (★★★, Sonnet high; Opus extra-high reads the landing)

**What a player sees today.** One spoiler rule fits everyone: a Strategy answer covers named story beats and endings,
and naming a boss unlocks it. A player who wants nothing covered, or one who wants boss tactics covered too, has no
choice. Decided as three tiers on 2026-09-01 (D50) and confirmed in plan 98's call 5.

**Where it comes from.** The policy paragraph the AI reads is written by `_strategy_spoiler_policy_block` in
`py_modules/backend/spoilers/strategy_spoiler_policy.py`, called from `build_system_prompt` in
`py_modules/backend/prompts/ollama_prompts.py` (near line 613), with the title profile from
`spoiler_title_profiles.py` and the named-entity result from `strategy_entity_extraction.py`. The risk chip is
`spoiler_risk_service.py`. Settings follow the Text size pattern: `chat_text_size` in
`py_modules/backend/settings/settings_service.py` (line 487, `_enum`), `chatTextSize` in
`src/features/settings/usePluginSettings.ts` (the one table), `bonsaiSettingsSchema.ts`, `bonsaiSettingsNormalizers.ts`,
the row `SettingsTabChatTextSizeRow.tsx` built on `SettingsTabChoiceRow.tsx`, inside `SettingsTab.tsx` and
`settingsTabFolds.ts` (the Story spoilers section), with `SettingsTab.textSizeWalk.test.tsx` as the walk test.

**Build, four commits.**
1. The setting: `spoiler_tier`, values `strict`, `default`, `open`, default `default`, in every place
   `chat_text_size` appears in both languages (rule 18). The read-back test and the two contract tests pass.
2. The policy: one paragraph per tier. `default` is today's text, byte for byte (the answer test must read the same).
   `strict`: bosses, endings and chapters covered too, with the title profile's low-story relaxation **off**; naming a
   boss or item still unlocks that one thing (rule 7 of the spoiler constitution). `open`: no cover at all, no spoiler
   fence asked for. The tier reaches `_strategy_spoiler_policy_block` through one new argument threaded from the
   settings in `game_ai_request.py` through `build_system_prompt` (one pass-through in the prompt file; nothing else
   there changes). The risk chip reads the tier: `open` always low, `strict` never relaxed by the title profile.
3. The row: "Story spoilers" section, a three-way choice row copied from Text size with the labels "Hide more",
   "Default", "Hide less" in that order; Left and Right change it; the value saves and survives close and reopen.
4. Measured before you report: `python scripts/kb/eval_kb_answers.py --samples 3` once per tier (`--variant` or an
   environment switch you add for the run only, named in the report): `default` identical to a run without your change;
   `strict` fences on more of the boss rows; `open` fences on none. The numbers go in your report as a table.

**Files owned:** the spoiler package's three files above, `settings_service.py`, `game_ai_request.py` (the one
pass-through), `ollama_prompts.py` (the one pass-through), the settings schema, normalizers and hook, `SettingsTab.tsx`,
`settingsTabFolds.ts`, a new `SettingsTabSpoilerTierRow.tsx`, their tests, `eval_kb_answers.py` only for a run switch.

**The test at the Deck's level:** the walk test models Steam's scroll and walks Story spoilers → the tier row → Left,
Right → Down out of the section, no stop twice; a prompt test asserts the strict paragraph contains the boss rule and
the open paragraph contains no fence instruction, and the default paragraph equals today's.

**The Deck check (P98-SPOILER-TIER, block K1):** the row takes Left and Right and keeps its value after close and
reopen (read the settings key by name); a Hades question that does not name the boss is covered under "Hide more" and
plain under "Hide less" (two differently worded questions, covers counted on screen, 250 ms reads).

---

## C and D — Thumbs-down that stops a wrong note coming back

**What a player sees today.** Under an answer, Not really opens five reasons (wrong information, too long, too short,
wrong game, unmarked spoiler). A note that was wrong for the question comes back next time all the same. The drawing
picked by the maintainer: [option C](https://claude.ai/artifact/K2MXtVYoEYV6cNxsAzUh43) (D112 item 8; plan 98 call 6).

**The contract both lanes build to (write it the same way in both):**
- Each entry of `kb_attached_notes` (the ask result, the live snapshot and the saved chat) gains three fields:
  `section_id` (the library's own id of the note or tip; 0 when unknown), `kind` (`"note"` or `"tip"`) and `demoted`
  (true when the store holds one or more downs for it). Types in `src/types/inputTransparency.ts` (`KbAttachedNote`)
  and `src/types/backgroundAsk.ts`.
- One new plugin method `demote_rag_corpus_note(section_id: int, reason: str, undo: bool = False)` returning
  `{ok, downs, excluded}`. Reasons: `wrong_tip`, `outdated`, `wrong_edition`. Undo removes the newest down.
- The store: `rag_demote.json` in the plugin's settings folder (`decky.DECKY_PLUGIN_SETTINGS_DIR`), shape
  `{"version": 1, "notes": {"<section_id>": {"downs": 2, "reasons": ["wrong_tip"], "updated": "<iso>"}}}`.
- Ranking: after the fused order is final (notes and tips alike), a card with one or two downs moves behind every card
  with none, keeping its order among the demoted; a card with three or more downs is dropped from the candidates. The
  budget and the top-k then apply as today.
- The feedback log accepts the three new reason ids beside the five.

### C — the back end (★★★, Sonnet high)

**Where it comes from.** `py_modules/backend/knowledge/knowledge_base_service.py`: `_fuse_cards_by_rrf` (line 717)
and its callers decide the order; `KnowledgeRetrievalResult.sources` drops cards without a source URL, so ids must
travel in a new field. `kb_attached_notes.py` parses the formatted block back into entries by name; it needs the ids
beside it. `py_modules/backend/answer/feedback_service.py` holds `_VALID_CHIP_IDS`. `main.py` and
`py_modules/backend/knowledge/rag_corpus_rpc.py` hold the plugin methods for the knowledge base.

**Build, four commits.**
1. `KnowledgeRetrievalResult` gains `attached_ids: list[dict]` (section_id, name, kind) for every card that survived
   the budget; `kb_attached_notes.py` merges them into the entries by position and name; the two type files gain the
   fields; the attach log line gains `demoted=<ids>`.
2. A new `py_modules/backend/knowledge/kb_demote_store.py`: read (cached by file time), record, undo, `downs_for(ids)`;
   never raises out (a damaged file reads as empty and is logged once).
3. `apply_demotes(ordered_cards)` in the store module, called once where each fused order is final in
   `knowledge_base_service.py` (one import, one call per path); the `demoted` field filled from it.
4. The plugin method (`main.py` → `rag_corpus_rpc.py`), and the three reason ids in `feedback_service.py`.

**Files owned:** the files above, `src/types/inputTransparency.ts`, `src/types/backgroundAsk.ts`, tests
`tests/test_kb_demote_store.py` (new), `tests/test_knowledge_base_service.py` (the ranking rule), the feedback test.

**The test at the Deck's level:** against the built library, "how do i beat the glyphid dreadnought" with Deep Rock
Galactic: Survivor's id attaches its notes as today with an empty store; with one down on the first attached note, that
note is last among the attached; with three, it is absent and another note takes its place; undo restores the order.
Run `python scripts/measure_kb_thin_match.py` (or the fixture loop it uses) with an empty store: every one of the 287
fixture questions attaches exactly what it attaches on the tip (report the count).

**The Deck check (P98-DEMOTE-01, block K1, with D).**

### D — the screen (★★★, Opus medium; the advisor reads the diff before landing)

**Where it comes from.** `src/features/answer/reply-actions/buildReplyActionsElement.tsx` draws Helpful, Not really and
the reasons; `useReplyFeedbackChips.ts` holds their state and D-pad chain; `replyRatingChoices.ts` their look;
`src/shared/dpad/replyStopRegistry.ts` the stops; `src/features/knowledge-library/buildKbNotesBlockElement.tsx` the
notes block; the drawing names sizes (chip 24 px tall, 11 px words, the column rows for "which note").

**Build, three commits.**
1. When the turn's `kb_attached_notes` is non-empty, Not really adds three chips after the five: Wrong tip, Outdated,
   Wrong edition. Picking one on a one-note turn calls the demote method with that note's `section_id` and shows the
   confirmation line "Noted — <name> will rank lower for questions like this." with an Undo button beside the existing
   "Marked not helpful" line; Undo calls the method with `undo`. The existing feedback save still runs with the new
   reason id.
2. On a two- or three-note turn, picking one of the three opens one more row, "Which note was it?", a column of chips:
   each note's name, then "Both of them" or "All of them". A on a name demotes that note; A on the last demotes all. B
   returns to the reasons with the reason remembered. The same chip builder and the same chain, one row deeper.
3. The notes block tags a note whose `demoted` is true: "ranked lower by you" after its name, in the block's open
   state, the drawing's gold.

**Files owned:** the five files above, `src/styles/sections/*` only for the two new rows if a rule is needed, and tests
beside them (`buildReplyActionsElement.demote.test.tsx`, `useReplyFeedbackChips.demote.test.ts`, the notes block test).

**The test at the Deck's level:** a bounded walk with Steam's scroll modelled: thumbs → Not really → the eight reasons
→ Wrong tip → the which-note column → a name → the confirmation with Undo → Down leaves to Show details; B from the
column returns to the reasons; no stop visited twice; the three chips absent when no note was attached; the one-note
case skips the column. Every new stop hears A and B (it is inside the plugin's own tree).

**The Deck check (P98-DEMOTE-01, block K1):** Deep Rock Galactic: Survivor running, a boss question that attaches two
notes (read Show details); Not really → Wrong tip → the first note → the confirmation names it; a second, differently
worded boss question no longer lists that note first; Undo; a third question lists it again. Record every stop's name
after every press.

---

## H — The route look for the strategy checklist (★★★, Opus medium; the advisor reads the diff before landing)

**What a player sees today.** After a Strategy answer, the checklist the AI writes is a list of tick-box rows, all
shown at once. The maintainer picked, on the mock-up board's tab 5, option C: the way there as a line of stops, the next
stop open, later stops covered, A shows the next ("the best implementation of the strategy checklist").

**Where it comes from.** `src/features/strategy/StrategyChecklistPanel.tsx` (the rows, Decky Buttons with nav handlers),
`strategyChecklist.ts` (the state shape), `strategyChecklistPersistence.ts` and `useStrategyChecklistSession.ts` (ticks
saved per game), `src/shared/dpad/strategyChecklistNav.ts` (the stop count and moves); the drawing is in
`docs/demos/mockup-board/src/` under tab 5 (read it for the look and the sizes). **No prompt change this session:** the
route draws the items the AI already writes; a "what you need" line is drawn only when an item's own text carries one
("Needs: …"); otherwise it is omitted. The prompt clause is a follow-up, named in your report.

**Build, three commits.**
1. The state gains `revealed` ids beside the ticks, saved the same way. An item is open when it is first, or ticked, or
   the one before it is ticked, or revealed; otherwise it is covered. A list with fewer than three items has no covers.
2. The look: open stops as today; a covered stop shows its number and "Hidden until you get there — A to show", drawn
   the way a spoiler cover is (the same colours and radius, read from the tokens file). A on a covered stop reveals it;
   A on an open stop ticks it as today. The stops stay the same Decky Buttons with the same nav handlers; the count does
   not change, so the walk does not either.
3. The "what you need" line under an open stop, only when its text carries one.

**Files owned:** the five strategy files above, `docs/design-tokens.md` only if a token is missing (say so), tests
beside them including a bounded walk with Steam's scroll modelled and a reveal-then-reopen test.

**The test at the Deck's level:** a five-item checklist renders stops 1 open and 2 to 5 covered; A on 2 reveals it and
the reveal survives a remount; ticking 1 opens 2; Down walks 1 to 5 and leaves; no stop twice.

**The Deck check (P98-ROUTE-01, block K1):** a "how do I get to the first boss" question in Hollow Knight by name,
Strategy mode, draws the route; Down walks the stops; A on a covered stop reveals it; a tick survives close and reopen;
the walk is saved with `deck_saveCheck`.

---

## I — The screenshot reading measurement, step 1 (★★ this session, Sonnet high)

**What a player sees today.** Attaching a screenshot is a headline feature and nothing measures how well the AI reads
it. The roadmap entry (added 2026-09-25) asks first for a labelled set and a scoring script; improvements come later.

**Where it comes from.** `py_modules/backend/media/screenshot_media.py` shrinks and encodes a picture; the prompt
gains an image hint when `has_images` is true (`ollama_prompts.py`, near lines 194 to 234); the answer eval
(`scripts/kb/eval_kb_answers.py`) already runs the real ask path on this PC with a fake plugin (`run_game_ai_request`,
lines 800 to 1000) — reuse its setup rather than inventing a second harness.

**Build, three commits.**
1. The labels file `tests/fixtures/screenshot_eval_v0.json`: one entry per picture — `file` (a name under the
   workshop's `screenshots/plan98/` folder), `game`, `scene` (title, menu, play, pause, loading), `boss` (or empty),
   `running_game_known` (true when the game's app id is handed to the ask). Two or three entries from pictures already
   on this PC (`screenshots/`, the `*_game.png` captures) prove the pipeline; block K2's pictures are added by the
   session.
2. `scripts/kb/eval_screenshot_reading.py`: for each entry, the real ask path with the picture attached and the
   plugin's own question ("What game is this and where am I? Name any boss or enemy on screen."), once with the game
   known and once unknown; reads the reply and marks right game, right area, right boss, and "said it did not know" as
   its own result; records time to first word; `--model` (default `gemma4:e2b-it-qat`), `--samples`, `--only`. The
   report (printed, and written to the workshop research folder by the session) gives, per model, out of a hundred:
   named the game, named the area, named the boss, said it did not know.
3. `tests/test_eval_screenshot_reading.py`: the reply reader on canned replies (a right game, a wrong one, a "not
   sure", a reply naming two games).

**Files owned:** the three files above, the eval's shared helpers only if a seam is needed (say so).

**The test at the Deck's level:** none; this is a PC measurement. The report shows one real run on the two or three
pictures with the Deck's model, the three figures and the first-word times.

---

## F — The four measurements, one after another on this PC (★★, Sonnet medium, a long job)

Nothing in the repo changes. Every report file goes to the workshop research folder; your report carries the numbers
and the exact commands. Run them in this order; if time runs out, report what finished.

1. **The keyword-blind slice of the search test.** Run `scripts/kb/eval_kb_embed_models.py` in its arms-comparison
   mode (read its `--help`; the flag runs only the keyword / meaning-only / fused comparison) with per-question output.
   Count the labelled rows where the word search returns nothing and the fused search still finds the right note; list
   their ids. Last count: 3, before 36 more blind rows landed. Report the count on the tuning rows and on the held-back
   rows separately.
2. **The troubleshooting reach.** The 24 plainly-worded problem sentences from 2026-09-07 are in the workshop archive
   (find the list with `grep -rn "drops me back to the library" C:\Users\still\Documents\bonsAI-workshop\archive`;
   plan 48's report holds the table). Drive the real pipeline with nothing running, the way
   `scripts/measure_kb_thin_match.py` does, once per sentence: does it reach the tip sheet, which tip comes first, and
   is that tip right (read by hand, one line of why). Then the held fix: `git -C <copy> diff experimental...lane/kb-symptom-search -- py_modules > .scratch/symptom.patch`,
   `git apply` it in your copy's working tree (not committed); if it does not apply within an hour, report that and
   skip; otherwise repeat the 24 and `git apply -R`. Table: sentence, reaches a tip (before / after), first tip
   (before / after), right or wrong (before / after).
3. **The answer test with the character voice on.** `python scripts/kb/eval_kb_answers.py --samples 3` once without a
   voice and once with `--voice alig_ali_g` (the maintainer's own pick on 2026-09-06, D80 item 2), the same evening, the
   same model. Report facts kept, contradictions, fence and menu rates for both, side by side.
4. **If time allows, the category-card question (D41).** On the fixture's strategy rows, count how often the first
   attached note's name is a category word (Weapons, Classes, Bosses, Enemies, Items and the like) on a question that
   names one member of that category. A small script in `.scratch/`; numbers and the ids only.

---

## L — The wrong-subject family (★★, recurring; Opus medium; written out by the session after consult 1)

**What a player sees today.** With a covered game running, a made-up boss ("Grimthak") or an off-subject question
("how do I buy a house") can draw a "From the notes" block about something else, and the "No close match" line that
should warn is sometimes skipped. Found 2026-09-07, seen 2026-09-26, 2026-10-14 and 2026-10-22; three floor moves were
measured and each cost right answers.

**Where it comes from (for the consult and the lane).** `py_modules/backend/knowledge/kb_not_in_notes_notice.py`:
the line keys off two signals (no keyword support and a meaning score under the 0.65 ceiling, or no word of the
question in any attached note; the measured table is in the file's comments, lines 140 to 200, and the newest rule at
lines 380 to 440). `knowledge_base_service.py`: `STRATEGY_MEANING_FLOOR = 0.523` (the highest value that loses no right
note; its comment, lines 398 to 431), `VECTOR_RECALL_FLOOR` and the pool margin (lines 298 to 330). The evidence:
`workshop:test-evidence/plan97-NOTES-BLOCK-04.json` (two weak Dreadnought notes attached for "Grimthak" and judged
close), `plan93-NOTES-BLOCK-04-game-strategy-D3.json`, `plan70-NO-CLOSE-MATCH-HK-02.json`, `plan81-P81-KB-NOTES-FIRST.json`,
and block K0's four fresh readings (`plan98-NOTES-BLOCK-04-READING-1` to `-4`).

**Build:** the one fix shape consult 1 names (a third signal, a made-up-name check, a rule on how many weak notes may
attach, or another). One commit for the rule with its tests, one for the measurement script's extension.

**The gate (not negotiable):** `scripts/measure_kb_thin_match.py`, extended if needed, over the 287 fixture questions
with a recorded right note, each asked with the game running and with its name typed: no right note lost, no line added
to any of them; the four device sentences and the two 2026-10-22 made-up bosses caught (no block, or the line).

**Files owned:** `kb_not_in_notes_notice.py`, the attach region of `knowledge_base_service.py` (lands after C),
`scripts/measure_kb_thin_match.py`, their tests.

**The Deck check (P98-NOTES-BLOCK-04, block K3):** the four K0 questions again, Strategy, Deep Rock Galactic: Survivor
running: no block for a made-up subject, or the line shown; a real boss question unchanged.

---

## E — The seed button's stale words (★, Haiku high on trial; Sonnet medium if it stalls)

**What a player sees today.** Developer tab → "Install seed knowledge base", with a hint saying the public download "is
not live yet". It has been live since August. The maintainer's call (plan 98, call 4): keep the button this session,
fix its words.

**Build, one commit.** Find every place the hint's words appear (`git grep -n "live yet"` across `src`; the walk test
at `src/features/developer/DeveloperTab.foldedWalk.test.tsx` line 272 asserts the old text) and change the hint to:
"Installs the library built with this plugin, for testing. Players download the library from the Ollama tab." The
button's label stays "Install seed knowledge base" (two saved Deck walks match it by that label).

**Files owned:** `src/features/developer/developerRowsDiagnostics.tsx`, `src/features/developer/developerTabFolds.ts`
(if the words are there), the Developer tab tests that assert the hint.

**The test at the Deck's level:** the walk test reads the new hint under the button.

**The Deck check (P98-SEED-HINT, block K1 or K3):** the Developer tab's button shows the new hint; the saved walk
`P86-DEVELOPER-WALK` replays.

---

## M — A bug found tonight (template)

One section per bug, written by the session: what a player sees (from the evidence file), where it comes from (the
file and line the session read), the one change to build, the files owned, the test at the Deck's level, and the row
(`P98-M<n>-<NAME>`). Sonnet high when the fix needs a judgment, Sonnet medium when the cause is known and there is one
obvious way; about an hour each; a bug that resists is written up and left open.
