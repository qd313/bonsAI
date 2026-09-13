# 46 — Knowledge base, wave one: four PC jobs, one release, then a long Deck check

Written 2026-09-06, before any code. **Nothing here runs until the maintainer says "go".** The calls in § 3 were
answered the same day (D80), and the maintainer's direction is: once a milestone is verifiably complete and as
intended, keep going without asking. The one stop that stays is the public push of the release (§ 5, wave 3).

This is the first wave picked from the status report ([37](37-rag-status-report.md)) on 2026-09-06: the four
knowledge-base jobs that need no Deck, followed by one corpus point release, followed by a long verification
session on the Deck. It is written so that a weaker model can run it: every lane brief names its files, its
commands, its tests and what "done" means.

**Who runs what.** One session on **Opus at extra-high effort** runs the whole thing and lands every commit.
Up to five helpers on **Sonnet 5 at high effort** build in their own copies of the repo (git worktrees). A
separate, later session on **Opus at medium effort** runs the Deck checks written in § 8 and records what it
sees; it does not diagnose failures — the routing table gives that job to Opus at extra-high.

Read first: [CLAUDE.md](../../CLAUDE.md); [AGENTS.md](../../AGENTS.md) § 3 (the model table and the lane
rules); the roadmap's [Knowledge base and RAG](../roadmap.md#knowledge-base-and-rag) section; the status
report [37](37-rag-status-report.md); the answer-quality plan [30](30-kb-answer-quality-plan.md) § 4.3, § 4.7,
§ 4.8; the new-titles plan [40](40-new-titles-from-the-library.md) § 7; and the ground rules at the top of
[36-feature-session.md](36-feature-session.md) § 6, which this session keeps.

---

## 1. What is true right now (checked 2026-09-06, nothing changed)

- **The bug-fixing session is finished.** Its Speed-mode fix is on the shared branch (`c72310a`), with only
  the Deck check owed. It also explained the "fifth slower" search: the first question after a quiet spell
  pays to wake the embedding model, and the next one does not (1.47 s, then 0.05 s). The prompt text and
  the knowledge-base code are free to edit.
- **The tree is clean at `1793d15`** on `experimental`. The orchestrator records the tip it actually starts
  from in § 11 and gives that hash to every lane.
- **The library has 266 cards over 25 games.** Twelve of those games were written up on 2026-09-06 and
  have no test questions, no answer-test rows and no release. (The docs say "eleven"; the list has twelve.
  Plan 40 § 7 is the list.)
- **The search test has 341 questions:** 221 tuning rows and 120 blind rows; 289 game questions and 52
  troubleshooting questions, 17 of the troubleshooting ones blind. None mentions any of the twelve new
  games. No row uses a second right answer yet.
- **The answer test has 37 cases,** all on the old thirteen games, and runs with the character voice off and
  thinking off.
- **Game notes are attached and then thrown away before the model reads them** (roadmap, ★★★, measured on the Deck
  2026-09-06, filed after this plan was first written). With the voice on and thinking at medium, a Strategy question
  sends about 2,500 to 2,800 prompt tokens plus a 2,112-token reply budget into a 4,096-token window. Ollama keeps
  the end and drops the start without a word: the identity, the rules and the cards. The voice suffix is appended
  last, so it survives; the cards do not. Asked about a Hades boss with fifteen Hades cards attached, the reply was
  generic. **The PC answer test cannot see this**, because it runs with the voice off and thinking off, which keeps
  every prompt inside the window. Lane C now owns this bug (§ 6C) and the answer test gets the switches that let
  the PC reproduce a Deck-shaped prompt.
- **No weight sweep exists.** The word "sweep" in the search test script means the embedding-model
  comparison, not the blend weights. The blend weights are two constants read at fusion time.
- **The answer test has no "answer first" variant** and no voice switch.
- **The PC has what the tests need:** Ollama on `127.0.0.1:11434` with `nomic-embed-text` (search) and
  `gemma4:e2b-it-qat` (answers). The orchestrator confirms both with `ollama list` in wave 0.
- **The corpus publish clone exists** at `../bonsai-knowledge-base` next to this repo.

## 2. The five pieces, and what a person notices

| # | Stars | Piece | What a person using the plugin notices | Lane |
|---|---|---|---|---|
| 1 | ★★★★ | **Blind questions for the twelve new games**, added to the search test; answer-test rows for the same games | Nothing yet. This is the gate: without it the new cards cannot be measured and should not be released | A (blind), E (answer rows) |
| 2 | ★★ / ★★★★ | **Eval tooling and the weight sweep** — a sweep flag, per-question output for what ships, rows that may name a second right answer | Nothing directly. If the sweep agrees with the blind reading, the right card lands first about nine points more often on realistic questions (63% against 54%) for a two-line change | B |
| 3 | ★★★ | **Prompt diet, and the cards no longer thrown away** — drop the citation instruction nobody can see, send the screenshot rules only with a screenshot, put the cards next to the question, and shorten the reply budget only when the prompt would not fit. Plus voice and thinking switches on the answer test | A Strategy question with the voice on gets an answer built from the cards instead of vague general tactics. Today the cards are silently cut off the front of the prompt on every such question. Also slightly faster first word and fewer rules per fact. Measured, not assumed | C |
| 4 | ★★ | **Symptom-only troubleshooting reach** — a question that describes the problem without naming it reaches the right tip | *"The game drops me back to the library a few minutes in"* gets the crash tips. Today it gets nothing because the word "crash" is absent | D |
| 5 | ★★★ | **One corpus point release** in today's format, carrying the 105 new cards | Twelve more games get notes instead of the model's memory. Nothing already installed goes stale, because the format does not change | orchestrator, with your go |

Not in this wave, on purpose: the "not in my notes" line, follow-ups remembering, the answer-first test,
the embedding-model pull, spoiler tiers, the starting-out kind, the card style pass, and the measured
context-window experiment (8,192 needs a Deck memory reading and is its own roadmap entry). They are wave two and
the format-change release; see the roadmap. The focus bugs in the roadmap's Bugs list are a separate session
(§ 3, item 7).

## 3. The calls, answered 2026-09-06 (D80)

1. **The symptom-only meaning search runs in Speed mode too**, but only with no game running, and only after the
   keyword search and the topic router have both come back empty. That is Lane D's scope exactly as written in § 6.
   Cost: one embedding call, about a second when the model is warm, only on questions that would otherwise get no
   tips. Row R3 in § 8 times it on the Deck.
2. **The voice is Ali G** (preset id `alig_ali_g`). A character-voice bug is being worked in another chat right now.
   Lane C still builds the `--voice` switch; the orchestrator's first voice-on run waits until that fix has landed on
   the shared branch. If it has not landed by the end of wave 2, the run is written up as owed in § 11.
3. **The release push is the one remaining stop.** Build and check happen without asking; the push waits for a
   second "go" with the manifest line in front of the maintainer — unless the "go" message says the push is included.
4. **The weight change is authorised** (D68) and is a heads-up in the log, not a stop: if the sweep and the blind
   confirmation agree, the orchestrator flips the two constants and writes the numbers into the commit and § 11.
5. **Run on once a milestone verifies.** What counts as verified is the gate table at the end of § 5. No pause for
   confirmation between lanes, landings or eval runs.
6. **Open — answer in the "go" message: when the prompt would not fit the window, shorten the reply instead of losing
   the cards.** Recommended and written into Lane C as a commit: keep the thinking budget, shrink only the visible
   reply so that prompt plus reply fits 4,096, never below 600 visible tokens, and log one line saying it did. The
   trade is a shorter Strategy reply on the questions that overflow today, against a reply built from the cards. The
   diet alone claws back about 340 tokens and the overflow is 500 to 820, so the diet alone does not close it. The
   other two options — raising the window to 8,192, or lowering Strategy's reply cap for everyone — stay separate
   calls (the window one needs a Deck memory measurement and is already its own roadmap entry). Strike commit 6 in
   Lane C if you say no.
7. **The focus bugs on the roadmap are not in this wave.** They need the Deck as the gate and Opus at extra-high after
   a measurement; this wave keeps the Deck free until the QA session. They fit a separate bug-fixing session of
   their own (plan 35's shape) that another chat can run alongside, on its own branch, because none of them touch
   the Python, fixtures or scripts this wave edits.

## 4. Who does what

| Role | Model and effort | Does | Never does |
|---|---|---|---|
| Orchestrator | Opus, extra-high | Wave 0 prep; briefs and launches lanes; labels the blind questions; lands every lane one commit at a time; runs the canonical eval runs; makes the weight call from the sweep; builds and checks the release; writes the roadmap, testing, changelog and status-report rows; writes the Deck rows for the QA session | Writes lane code itself while a lane is open on the same files; pushes the release without the second "go" |
| Lane A | Sonnet 5, high | Blind search-test questions for the twelve new games | **Opens any card text**, runs the search eval, reads plan 40 § 7's card table beyond the title list |
| Lane B | Sonnet 5, high | Eval tooling: sweep flag, per-question output, second-answer rows | Edits the blend-weight constants; commits eval reports |
| Lane C | Sonnet 5, high | Prompt diet in code, placement switch, voice switch on the answer test, before/after measurement | Touches the knowledge-base service |
| Lane D | Sonnet 5, high | Symptom-only meaning search over the tip sheet, gated; measured on the 17 blind troubleshooting rows | Touches the prompt text or the eval script |
| Lane E | Sonnet 5, high | Answer-test rows for the twelve new games, written from the cards | Is the same agent as Lane A |
| QA session | Opus, medium | Runs the § 8 rows on the Deck, records evidence, stops on failure | Diagnoses or fixes; wipes plugin data; runs two rows at once |

Five lanes is the cap (AGENTS.md § 3). A and E share no files but must be different agents, because whoever
writes a card's answer-test row has read the card.

## 5. Order of work

### Wave 0 — orchestrator alone, about an hour

1. `git status` clean; `git log -1 --format=%H` → the tip hash for every brief. Check
   `docs/planning/` and the decisions tail for numbers other chats took today.
2. Baseline green on the shared checkout: `npx tsc --noEmit`, `npm test`, `npm run test:py`,
   `npm run build`, `node scripts/check-focus-patterns.mjs`. Red baseline → stop and report.
3. `ollama list` shows `nomic-embed-text` and `gemma4:e2b-it-qat`. Missing → pull them before any lane starts.
4. Build the corpus once and keep the numbers: `python scripts/build_rag_db.py --seed --out build/knowledge-base`
   must print manifest version (today's UTC date) and 266 sections. Then
   `python scripts/publish_corpus.py --build-dir build/knowledge-base --check` must pass. If the licence
   gate refuses a card, that is a Lane-free fix for the orchestrator before anything else. **Copy the built
   `build/knowledge-base` folder into every worktree after step 7** (the folder is git-ignored, and both eval
   scripts read it from the worktree root) so no lane spends its first ten minutes building and hitting Ollama.
5. Take the **pre-wave baselines on 266 cards, in the background, while the lanes launch** — neither blocks a lane:
   `python scripts/eval_kb_embed_models.py --arms-only` (search) and
   `python scripts/eval_kb_answers.py --samples 3 --label before-wave1` (answers). The answer run is Lane C's
   "before"; Lane C does not repeat it. Commit the report files under `docs/archive/research/` with a message
   saying they are the 266-card baselines before wave one. Expect the old search numbers to move — there are
   more cards to be confused by now. That is the new floor, not a regression.
6. Write the lane agent definition: copy `.claude/agents/feature-lane.md` to `.claude/agents/kb-lane.md`,
   point it at this plan instead of plan 36, and add two rules: *the PC's Ollama at 127.0.0.1:11434 may be
   used; the Deck may not*; and *build your own corpus in your worktree with the build command in § 6 before
   running any eval*. Lane A's brief adds the blindness rules on top.
7. Create one worktree per lane from the tip: `git worktree add ../bonsai-lane-A -b lane/kb-blind-questions`
   and so on for B, C, D, E. Give each lane its absolute path. The five briefs in § 6 are written to be pasted
   as the task text with only the tip hash and the path filled in; launch all five in one message.
8. Record the tip hash, the baseline numbers and the corpus version in § 11.

**Target: lanes running within about fifteen minutes of "go".** Steps 4 and 5 finish in the background; step 2
is the only thing that must be green before a lane starts.

### Wave 1 — five lanes, all at once, no Deck

Lanes A, B, C, D and E start together; their file sets do not overlap (§ 6). Each lane's first act is the
ancestry check, then the five gates on an untouched tree.

While they work, the orchestrator does nothing on their files. It may write the Deck rows for § 8 into a
draft, and it may pre-write the roadmap and testing text it will need at landing.

**Labelling is delegated, not done by hand.** Once Lane A has landed, the orchestrator sends Lane E a follow-up
(same agent, context intact): read the landed fixture from the shared checkout by absolute path, and return a
table of `id → card name or blank` for every new row, with a one-line reason for each blank. Lane E has read the
cards, which is what a labeller needs; Lane A has not, which is what a writer needs. The orchestrator reads the
table, applies it with a short script, and commits the labels. That turns about an hour of judgment into ten
minutes of review.

### Wave 2 — landing, orchestrator alone

**Land lanes in the order they finish.** Their file sets are disjoint, so nothing waits on anything else except
three things: the sweep runs after Lane B lands, and its blind confirmation is re-run once Lane A's labels are in
(cheap: one pair); the release build waits for Lane A's labels and Lane E; the landed answer-test run waits for
Lane C. The numbered list below is the dependency order for those three, not a queue.

1. **Land A** (fixtures only). Then **label** the blind questions (§ 6A, step "labelling") — this is the
   orchestrator's job, done with card *names* only, never card bodies. Commit the labels separately from the
   questions so the blind draft is visible in history.
2. **Land E** (answer-test rows). Run `python scripts/eval_kb_answers.py --samples 1` once to prove every new
   row resolves its game and attaches a card (the report's "card attached" column must read 100% on the new
   rows). Fix a row that does not before moving on.
3. **Land B** (eval tooling). Run `npm run test:py` and the arms run again: the per-question output must now
   be in the JSON.
4. **Run the sweep** on the tuning rows only: `python scripts/eval_kb_embed_models.py --arms-only --sweep-weights`.
   Read the table. If a pair beats 1:1 on "right card first" **and** on "in the top three" on the tuning rows,
   confirm that one pair once on the blind rows with `--confirm-holdout <pair>`. Write both tables into § 11
   (a heads-up, not a stop — D80). If the blind rows agree, change `RRF_W_FTS` / `RRF_W_VEC` at
   [knowledge_base_service.py:66-68](../../py_modules/backend/services/knowledge_base_service.py) in one
   commit, and rewrite the comment above them (lines 60–65) with the new run's date and numbers. If they do
   not agree, change nothing and record the result under D68 — that is a real finding.
5. **Land D** (symptom-only). Its report carries the before/after on the 17 blind troubleshooting rows;
   copy those numbers into the roadmap entry.
6. **Land C** (prompt diet). Its report carries three answer-test runs (before, diet, diet with late cards).
   Re-run the answer test once on the landed branch, baseline variant, 3 samples, to confirm the landed
   build matches the lane's "after" numbers. Then the voice run: `--voice <preset>` from call 2, 3 samples,
   and record it as the first voice-on measurement — it is a new baseline, not a pass/fail. **Only once the
   character-voice fix from the other chat is on the shared branch** (D80); otherwise write "owed" in § 11.
7. **Bookkeeping, one commit per landing** (lanes never touch these): the roadmap's knowledge-base section
   (each entry moves to *Deck check owed* or *Done* as the rules say), `docs/testing.md` rows, `CHANGELOG.md`,
   and the status report [37](37-rag-status-report.md) § 3 numbers and § 4 lists. Also close the slowdown
   bug's entry with the warm-up finding, and fix "eleven" to "twelve" where the list has twelve.

### Wave 3 — the release, orchestrator with the maintainer's second "go"

1. `python scripts/build_rag_db.py --seed --out build/knowledge-base` on the landed branch. Note the version
   (UTC date), section count (266), and byte size.
2. `python scripts/publish_corpus.py --build-dir build/knowledge-base --check`.
3. `npm run test:py` (the reproducibility and attribution tests read the build).
4. **Stop. Show the maintainer the manifest line.** Nothing leaves the machine until they say go — the one
   remaining stop in this plan, unless the "go" message already included the push.
5. `python scripts/publish_corpus.py --build-dir build/knowledge-base --push-hf --push-github --hf-clone-dir ../bonsai-knowledge-base`.
6. Read both channels back over the wire (fetch the manifest URL on each; the schema module holds the
   GitHub URL) and confirm the version matches. Add the row to the release table in
   [knowledge-base.md](../knowledge-base.md) (near line 275) and a changelog line.
7. Do **not** install it on the Deck from here. Installing through the plugin's own *Update knowledge base*
   button is the first QA row.

### Wave 4 — the Deck, a separate session, Opus medium

Section 8 is that session's brief. It starts only after wave 3, with the plugin deployed from the landed
branch and Fallout: New Vegas installed on the Deck by the maintainer.

### Wave 5 — the report

The orchestrator appends a progress log to this file (§ 11), and the QA session appends its own log under
it. Both in plain language: what a person now sees, then the numbers.

### Milestone gates — what "verifiably complete" means, so the orchestrator keeps going

| Milestone | Verified when |
|---|---|
| Wave 0 done | Five gates green on the tip; both models listed by Ollama; corpus built, 266 sections, publish check passed; both baselines committed |
| A lane landed | Its commits fast-forward onto the branch; the five gates green after the merge; its report lists the files it read (Lane A) or the per-row card-attached result (Lane E) |
| Labels applied | Every new row has a label or a reason for a blank; `npm run test:py` green (a label must name a real card) |
| Sweep decided | The tuning table and, if a pair won, the blind confirmation are in § 11; the constants changed or "no change" recorded under D68 |
| Symptom-only landed | Lane D's 17-row table re-run once on the landed branch and matching its report; the four blind natural sentences reach their topic |
| Prompt diet landed | The landed answer run is within two points of Lane C's "after" on facts kept and menu, fence-not-misfired at or above 91 of 96, prompt shorter; **the Deck-shaped run (voice on, thinking medium) warns on zero cases** |
| Release built | Manifest shows today's date and 266 sections; publish check passed; Python tests green |
| Release pushed | Both channels read back the same version over the wire |
| Deck rows written | § 8 carries every exact sentence for every batch, in one message for the maintainer to confirm |

If a gate fails, the orchestrator fixes or reverts that landing and re-checks. It does not ask; it records.

### Speed-ups, in one place

- Build the corpus once and copy it into the worktrees (wave 0, step 4).
- Both baselines run in the background while the lanes launch (wave 0, step 5); Lane C reuses the answer one.
- Five briefs pasted from § 6 in one message; lanes running inside fifteen minutes.
- Land in arrival order; only three real dependencies (wave 2).
- Lane E labels Lane A's rows; the orchestrator reviews a table instead of reading 72 questions cold.
- The second-answer support is Lane B's last commit and can be dropped if B runs long; nothing in this wave needs it.
- Every Deck chip batch is written into § 8 at landing and confirmed with the maintainer in one message before
  the QA session starts, so that session never waits mid-evening.
- Fallout: New Vegas can be installed on the Deck any time from now; it is only needed for row R5.

## 6. Lane briefs

Every brief inherits the kb-lane rules (ancestry check, five gates, one change per commit, stay inside
your files, never the Deck, never push, report at the end). The tip hash goes in the task text.

**Common commands.** Build a corpus in your worktree before any eval:
`python scripts/build_rag_db.py --seed --out build/knowledge-base` (Ollama must be running on the PC or the
build skips embeddings and every meaning-search number is wrong). Search eval:
`python scripts/eval_kb_embed_models.py --arms-only`. Answer eval: `python scripts/eval_kb_answers.py --samples 3`
(about three minutes). Both write reports under `docs/archive/research/`; **do not commit those reports from
a lane** — the orchestrator makes the canonical runs. Delete them or leave them untracked.

### Lane A — blind search-test questions for the twelve new games

**Goal.** About 72 questions a real player might type about the twelve new games, written without seeing a
single card, added to `tests/fixtures/kb_eval_v2.json` as blind rows.

**Blindness rules, on top of the lane rules.**
- Do not open `data/kb/strategy_seed.json`, anything under `build/`, or any `docs/archive/research/` report.
- Do not run the search eval or the answer eval (they print card names).
- Do not run `git log -p` or `git show` on the card commits, and do not grep the repo for game terms.
- Do not read plan 40 § 7 beyond the title list. The title list below is all you need.
- Your report lists **every file you read**. If you read something you should not have, say so; the
  orchestrator will discard your rows rather than ship a tainted test.

**The twelve games, with the ids and aliases the search test resolves on.**

| Game | `app_id` | `shortcut` | Tag for ids |
|---|---|---|---|
| Black Mesa | `362890` | — | BMS |
| Hollow Knight | `367520` | — | HK |
| DOOM Eternal | `782330` | — | DOOME |
| Doom 64 | — | `Doom 64` | DOOM64 |
| Grand Theft Auto V | `3240220` | — | GTAV |
| Grand Theft Auto IV | `12210` | — | GTAIV |
| Fallout: New Vegas | `22380` | — | FNV |
| Super Mario 64 | — | `Super Mario 64` | SM64 |
| Mario Kart 64 | — | `Mario Kart 64` | MK64 |
| Paper Mario: The Thousand-Year Door | — | `Paper Mario: The Thousand-Year Door` | TTYD |
| Pikmin 2 | — | `Pikmin 2` | PIK2 |
| Super Smash Bros. Melee | — | `Super Smash Bros. Melee` | MELEE |

A Steam title carries its `app_id` and an empty `shortcut`; an emulated title carries an empty `app_id` and
the shortcut name shown, which the corpus resolves through its alias list.

**What to write, per game: six rows.**
- Two `terse` (a few words, the way people type on a Deck keyboard) and at least two `natural` (a sentence).
- At least one `beginner` and at least one `familiar` skill level.
- **One "starting out" question** — what a new player asks in the first hour.
- **One question you believe no card is likely to cover** — a niche or late-game thing. Leave it in; the
  labeller decides whether a card exists.
- Spread the rest across how the game works, a boss or enemy, an item or upgrade, and a place. Prefer
  describing the thing over naming it (*"the guy with the big nail"* over the boss's name) — that is what
  makes the row measure retrieval rather than name-matching. Naming is allowed when players genuinely know
  the name; say so in `note`.
- No story spoilers in the question text.

**Row shape.** Copy this exactly, one object per row, appended to the `queries` array:

```json
{
  "id": "V2-T1-HK-01",
  "split": "holdout",
  "domain": "strategy",
  "app_id": "367520",
  "shortcut": "",
  "query": "how do i get past the guy with the big nail in the first big area",
  "intent": "Beat the early boss that guards the route onward",
  "topic_hint": "",
  "withheld_card_terms": [],
  "skill_level": "beginner",
  "input_style": "natural",
  "note": "Written blind 2026-09-XX; the writer had not read any card.",
  "expect_section": ""
}
```

`expect_section` stays `""` on every row you write. `withheld_card_terms` lists words you deliberately kept
out of the query (a proper noun you avoided); a test fails if the query contains one of them, so only list
what is genuinely absent. Ids are `V2-T1-<TAG>-NN`, NN from 01.

**Done when:** 72 rows (6 × 12) are in the fixture; `npm run test:py` is green (the fixture tests check the
withheld terms and the `status` field — leave `status` as it is); `python -c "import json;json.load(open('tests/fixtures/kb_eval_v2.json'))"`
parses; one commit.

**Report:** the commit hash; the count per game; the list of files you read; any question you were unsure
how to phrase.

**Labelling (orchestrator, after landing A).** Print card names only:

```
python - <<'EOF'
import json
s=json.load(open('data/kb/strategy_seed.json',encoding='utf-8'))
for sec in s['sections']:
    if sec['game_id']>=14: print(sec['game_id'], sec['section_type'], '|', sec['name'])
EOF
```

For each new row set `expect_section` to the one card name that answers it, or leave `""` when none does
(that is a deliberate gap and is excluded from the ship-gate maths). Do not rewrite a query; if a query is
unusable, delete the row and say so in the commit. A test fails if a label names no real card.

### Lane B — eval tooling: the weight sweep, per-question output, a second right answer

**Files you may edit:** `scripts/eval_kb_embed_models.py`, `tests/test_eval_kb_arms.py`. **Read-only:**
`py_modules/backend/services/knowledge_base_service.py` (you will monkeypatch two of its module constants
at run time; you never edit it). **Forbidden:** the fixture files, the service, any report under
`docs/archive/research/`.

**Where things are.** The four retrieval arms run in `_run_retrieval_arms`
([eval_kb_embed_models.py:750](../../scripts/eval_kb_embed_models.py)); the shipping arm is `_hybrid_retrieve`
(`:396`) with `with_recall=True`. Fusion is `_fuse_cards_by_rrf` in the service (`:1034`), which reads the
module constants `RRF_W_FTS` and `RRF_W_VEC` (`:67-68`) **at call time** — so setting them on the imported
module between runs changes the blend without editing the service. A case scores by `_score_cards` (`:361`
compares `expect_section` to the card name, lower-cased). Results are `QueryResult` rows
(`case_id`, `hit_at_1`, `hit_at_3`, `fts_empty`, `embed_ms`); tables come from `_arms_table` (`:847`); the
JSON payload is written near the end of `main` (`docs/archive/research/kb-embed-bakeoff-<date>-arms.json`).
Splits: `tune` and `holdout`; `_case_is_labeled` (`:862`) excludes blank labels.

**Three changes, three commits, tests first.**

1. **`--sweep-weights`.** Optional list of `w_fts:w_vec` pairs; default
   `1:1,0.75:1,0.5:1,0.25:1,0:1,1:0.75,1:0.5,1.5:1,1:1.5`. Embed every case **once** (the embed is the slow
   part; the arms runner already does this per case — reuse its shape). For each pair, set the two constants
   on the service module, run only the shipping arm over the **tuning rows**, score, restore the constants.
   Print one table: pair, n, right-card-first %, top-three %, both intervals. **Never print holdout in a
   sweep run.** A separate `--confirm-holdout w_fts:w_vec` runs exactly that one pair and 1:1 on the blind rows
   and prints the two side by side, nothing else. Test: a fake fusion that records the constants it saw proves
   each pair was applied and restored; a sweep run with a fixture that has holdout rows prints no holdout
   numbers.
2. **Per-question output for every arm.** Add `top_names: list[str]` (the arm's top three card names) to
   `QueryResult` with an empty default so existing constructors keep working, fill it where results are
   built, and write `"per_case": {arm: [{case_id, split, domain, hit_at_1, hit_at_3, fts_empty, top_names}]}`
   into the JSON payload. Test: the payload for a two-case fake run has a `per_case` entry per arm with the
   names in rank order.
3. **A second right answer** (last, and the orchestrator may cut it if you run long). `expect_section` may be a list of card names. The loader accepts a string or a
   list; a list **requires** a non-empty `note` (raise with the row id otherwise); a hit is any name matching;
   `_case_is_labeled` is true when any name is non-blank. Update `test_every_label_names_a_card_that_exists`
   to walk lists. Test: a list row hits on its second name; a list row without a note fails to load. Do not
   convert any existing row.

**Done when:** three commits, `npm run test:py` green, and one local `--arms-only --sweep-weights` run on
your worktree's corpus completes and prints the table (paste it into your report; do not commit the files it
writes).

**Report:** hashes; test names; the sweep table from your run; anything odd you saw in the per-question
output (a case whose top three are all from the wrong game, say).

### Lane C — the prompt diet, a placement switch, and a voice switch on the answer test

**Files you may edit:** `py_modules/backend/services/ollama_prompts.py`,
`py_modules/backend/services/ollama_service.py` (the window warning and the request options only),
`tests/test_ollama_service.py`, `scripts/eval_kb_answers.py`. **Read-only:** `main.py` (`_build_system_prompt` at
`:2972` passes the stacked knowledge block as `early_context_suffix`),
`py_modules/backend/services/game_ai_request.py:365` (where the Proton excerpt and the knowledge block are stacked
into one string), `py_modules/backend/services/ollama_ask_budgets.py` (the reply budgets: Strategy's visible cap is
1,600, thinking at medium adds 512, `resolve_ask_token_budgets` at `:65`),
`py_modules/backend/services/ai_character_service.py:134` (the voice suffix is appended **last**, which is why it
survives an overflow). **Forbidden:** the knowledge-base service, the fixtures.

**The bug you also own.** Roadmap: *Game notes are attached and then thrown away before the model reads them*
(★★★, measured on the Deck 2026-09-06; detail in `docs/roadmap-details.md` under the same title). With the voice on
and thinking at medium, a Strategy prompt is about 2,500 to 2,800 tokens; the reply budget is 2,112; the window is
4,096. Ollama drops the start of the prompt silently — identity, rules, cards — and the reply comes from the model's
memory while Show details still says the cards were attached. The warning that caught it
(`prompt_window_warning`, `ollama_service.py:622`, used at `:684`) only writes to the log. Two things fix it
together: the diet and late placement below (a card at the end of the prompt survives), and commit 6 (a prompt that
would not fit shortens the reply instead of losing its start).

**Where things are** (all in `ollama_prompts.py`): `build_system_prompt` at `:1077`; the dynamic block
(`:1176-1186`) always includes three screenshot rule lines (`vision_priority_line`,
`genre_franchise_cue_line`, `game_intent_line`, `:1159-1175`) whether or not an image is attached; the
knowledge-base clause (`:1208-1219`) tells the model to wrap claims in a citation fence with a trust tier;
`THIN_CONTEXT_HONESTY_CLAUSE` (`:920-925`) offers the same fence; `_REPLY_VERBOSITY_SHARED` (`:927-931`) lists
it among fences to close. Nothing in `src/` reads that fence (checked 2026-09-06: no file under `src/`
mentions it), and the citation instruction was obeyed once in 89 recorded asks. The `STRUCTURED CARDS` clause
(`:1225-1235`) and the glossary clause stay. Tests that pin the shape: `:1180` (early context precedes the
hardware appendix — must stay true), `:1313-1330` (the knowledge-base clause), `:829` (visual context line
with one image).

**Six commits, tests first, in this order.**

1. **The "before" numbers are the orchestrator's wave-0 answer baseline** (`before-wave1` in
   `docs/archive/research/`), taken on the same corpus and model; do not repeat that run. Your first commit adds a
   `prompt_chars` mean to the report meta if the harness does not already keep it (the harness captures the built
   prompt through its variant wrapper at `:701-706`; measuring its length there is the cheap way), and then you
   run once with `--samples 1 --label prompt-chars-before` only to record the prompt length before the diet. This
   commit may only touch the harness.
2. **Drop the citation instruction.** The knowledge-base clause becomes *"KNOWLEDGE BASE (offline corpus):
   Ground answers in the attached strategy/compat cards when relevant."* plus, when not relaxed, the existing
   spoiler sentence. Remove the optional fence offer from the thin-context clause and the fence name from the
   verbosity list. Re-aim the tests at behaviour: the clause is present, the fence name is absent, the
   spoiler sentence still depends on the relaxed flag.
3. **Screenshot rules only with a screenshot.** The three rule lines join the dynamic block only when
   `prepared_images` is non-empty. `vision_line` stays as it is. Tests: with no image none of the three
   phrases appears; with one image all three do; the existing `:829` assertion still holds.
4. **Placement switch.** Add `knowledge_block_placement: str = "early"` to `build_system_prompt`. `"early"` is
   today's order. `"late"` inserts the early block after the mode injects and immediately before the hardware
   appendix, so the cards sit as close to the question as the system prompt allows. Test both orders by
   position of the block header relative to a mode-inject phrase and the appendix. **Leave the default at
   `"early"` in this commit.** Then add `--kb-placement early|late` to the harness: it wraps
   `build_system_prompt` (same monkeypatch as the variant hook) to pass the keyword. Add `--voice <preset_id>`
   to the harness: sets `ai_character_enabled` true and `ai_character_preset_id` in `write_harness_settings`
   (`:133`), rejects an id not in `VALID_PRESET_IDS` from `ai_character_service`, and records the preset in
   the report meta. The maintainer's preset is `alig_ali_g`; do not run a voice *quality* measurement yourself — a
   voice bug is being fixed elsewhere and the orchestrator runs it once that fix lands. Also add
   `--think off|low|medium|high`, which writes `ask_think_effort` into the harness settings (default `off`, the
   fresh-install value; the maintainer's Deck runs `medium`). And two report columns that make the overflow visible:
   **window warnings** (how many cases logged `prompt_window_warning`; the harness already captures the plugin log,
   see `:384`) and **prompt tokens** (mean of the warning's own estimate, or `estimate_prompt_tokens` over the
   captured messages). Tests for all three flags on the harness's settings writer and for the two columns.
5. **Measure after, PC-shaped.** Two runs: `--samples 3 --label after-diet` and
   `--samples 3 --kb-placement late --label after-diet-late`. The noise band between two identical runs on this
   test is about two points. Read: the diet is a keep if facts kept and menu present are not below "before" by more
   than two points, fence-not-misfired stays at or above 91 of 96, and `prompt_chars` fell. Late placement wins on
   the PC-shaped run only if it beats early on facts kept by more than the noise band with nothing else worse.
   **Then measure Deck-shaped**, which is the run that matters for the bug: `--samples 1 --voice alig_ali_g --think medium --label deck-shaped-before`
   at the parent commit of your first diet change (use `git stash` or a scratch checkout of the tip), and the same
   at your head with `--kb-placement early` and again with `late`. Read only the **window warnings** and
   **prompt tokens** columns from these runs until the voice fix lands; the quality columns are noise while the
   voice bug is open. Expect "before" to warn on most Strategy cases; expect the diet to cut tokens by about 340
   and not to clear the warnings on its own. **Late placement is the default if it wins on the PC-shaped run or
   ties there** — because on a Deck-shaped prompt the cards at the end are the ones that survive. Flip the default
   in one commit with the numbers in the message.
6. **A prompt that would not fit shortens the reply instead of losing its start** (§ 3 call 6; skip this commit
   only if the "go" struck it). In `ollama_service.py`, where the request options and the warning are built
   (`:684`): when the estimate says prompt plus `num_predict` exceeds the window, keep the thinking budget whole
   and reduce the **visible** part of `num_predict` until it fits, never below 600 visible tokens; if even the
   floor does not fit, send the floor and keep the warning. Log one line naming the old and new `num_predict`.
   The estimate is 3.5 characters per token and errs low on purpose; do not change it. Tests with fake messages:
   a prompt that fits is untouched; a 2,800-token prompt at Strategy with thinking medium gets a visible budget
   that fits and its thinking budget intact; a prompt past the floor still sends the floor and warns. Re-run the
   Deck-shaped run at head: **window warnings must read zero** on every case, and the clamp line must appear only
   on the cases that warned before.

**Done when:** the commits above, `npm run test:py` green, the PC-shaped summaries and the Deck-shaped
warning and token counts are in your report, and the Deck-shaped run at head warns on zero cases. Do not commit
the report files.

**Report:** hashes; test names; a three-row table (before, from the wave-0 baseline / after / after-late × the
summary columns plus prompt chars); a second table for the Deck-shaped runs (before / diet early / diet late /
with the clamp × window warnings, mean prompt tokens, mean `num_predict` sent); the placement verdict and why;
anything in the prompt that looked dead and you left alone.

### Lane D — symptom-only troubleshooting reach

**Files you may edit:** `py_modules/backend/services/knowledge_base_service.py`,
`py_modules/backend/services/compat_topic_router.py`, `py_modules/backend/services/transparency_service.py`
(one label), `tests/test_knowledge_base_service.py`, `tests/test_compat_topic_router.py`,
`tests/test_transparency_kb_retrieval.py`. **Forbidden:** the prompt text, the eval script, the fixtures.

**The decision you are building** (D52, 2026-09-01, with call 1 from § 3 applied): when the topic router
matches nothing and the phrase gate did not fire, run the meaning search over the tip sheet behind the
second-signal gate. **Scope for this lane: no game running.** With a game running the question goes to the
game's cards today, and changing that is a separate call.

**Where things are** (`knowledge_base_service.py` unless said): the gate `should_retrieve_knowledge`
(`:321-378`) returns `(False, "")` for a no-game question that names no topic — that is why the question
never reaches the tip sheet; the router is `question_targets_compat_corpus`
(`compat_topic_router.py:291`) over `match_compat_corpus_topics` (`:273`); the phrase gate is
`question_matches_troubleshooting_log_context` (prompt module, `:774`). The tip path inside
`retrieve_knowledge_context` starts at `:1395` (keyword search plus routed-topic tips), and fusion happens at
`:1509` onward only when `nomic_ready and (cards or topic_cards or vector_recall_ready)`; for the tip sheet it
loads vectors for the pool by id (`_load_compat_vectors`, `:720`). `nomic_ready` includes `not speed_mode`.
The floors are `VECTOR_RECALL_FLOOR` (`:167`, 0.515), `VECTOR_RECALL_POOL_MARGIN` (`:212`, 0.0395) and
`VECTOR_RECALL_MARGIN_MIN_POOL` (`:220`). Show details labels come from `transparency_service.py:185-200`.

**Three commits, tests first.**

1. **The gate lets the question through.** In `should_retrieve_knowledge`, after the existing compat check
   and only when **no game is running** (no `app_id`, no `app_name`, no text-resolved title): return
   `(True, "compat")` with a way for the caller to know it is a probe, not a routed question — a third
   return value or a module-level marker, whichever the existing callers absorb with the least change
   (there are callers in `game_ai_request.py` and the eval script; keep the two-tuple shape for them and
   expose the probe flag another way if a three-tuple breaks them). Tests: a no-game symptom sentence now
   returns compat; a no-game ordinary sentence (*"thank you very much"*) also passes the gate (the floor and
   margin gate below carry the precision, as they do for game cards); a running-game question is unchanged.
2. **The probe.** In the tip path, when the keyword search and the routed topics both came back empty and
   the embed model is available: embed the question, load **all** tip vectors (a new small loader:
   `SELECT pattern_id, embedding FROM compat_pattern_vectors`), rank by cosine, keep the best
   `COMPAT_TOPIC_RECALL_K` that clear `VECTOR_RECALL_FLOOR` **and** the pool-margin gate computed over all tip
   vectors, and return them as the cards with `retrieval_method="hybrid"` and a `notes` value naming the
   probe (say `symptom_vector_probe`). Per call 1, this probe runs in Speed mode too — it is the one place
   the Speed skip does not apply, and only because the pool is empty; write the test
   `test_speed_mode_symptom_probe_runs_only_when_the_pool_is_empty` next to the existing
   `test_speed_mode_never_pays_for_the_meaning_search_compat` so the two rules are stated side by side.
   Tests with a fake embedder: the crash sentence with no "crash" word returns the crash tip; a junk
   sentence clears nothing and returns no cards; a sentence that already routed a topic never enters the probe.
3. **Show details says what happened.** One label in the transparency service so the ladder reads something
   like *Keyword + meaning (tip sheet)* on a probe turn; test it.

**Measure, before landing** (part of the report, not a commit): with the worktree corpus and the PC's Ollama,
run the production function over the 17 blind troubleshooting rows (ids `V2-C-28` … `V2-C-40`,
`V2-BLIND-H19`, `H20`, `H55`, `H56` in the search fixture), no game, Speed mode, once before your change
(checkout the tip in a scratch copy or stash) and once after. Report per row: routed topic, tip attached
(topic), probe fired yes/no, and cosine of the top tip. The thing to prove: the four blind natural sentences
(`H19` controller, `H20` storage, `H55` crash, `H56` audio) reach the right topic, and no keyword-routed row
got worse. Expect the two that already miss today (`H55`, `H56`) to flip; say which did not and why.

**Done when:** three commits, `npm run test:py` green, the 17-row before/after table in the report.

**Report:** hashes; test names; the table; the exact Show details wording; the one-sentence "a person now
sees" line for the roadmap.

### Lane E — answer-test rows for the twelve new games

**Files you may edit:** `tests/fixtures/kb_answer_eval.json` only. You read the cards; that is the point.
You must not be the same agent as Lane A.

**Where things are.** The fixture's `cases` array; each case has `id`, `app_id`, `app_name`, `ask_mode`,
`question`, `expect_card`, `must_mention` (a list of groups, each group a list of acceptable phrasings; the
reply must hit one phrase from every group), `must_not_say`, `expect_fence`, `expect_branches`, `note`. The
cards are in `data/kb/strategy_seed.json` (`sections`, filter `game_id >= 14`). Each new title's spoiler
profile was set in commit `56fbdab`; read `tests/contracts/spoiler-title-profiles.json` for which titles are
story-protected.

**Write two cases per game (24 rows), Strategy mode.** One on a boss, enemy or item card; one on a
how-it-works or starting-out card. For each: a plain question a player would ask; `expect_card` set to the
card's exact name; **two** `must_mention` groups, each built from a fact that is in the card, with three to
six fair paraphrases per group (the small model rewords; give it room); `must_not_say` with one thing the card
says is wrong, if the card states one; `expect_fence` false for a named boss or a no-story title, true only
for a genuine story question on a protected title; `expect_branches` true. For an emulated title set
`app_id` to `""` and `app_name` to the shortcut name from Lane A's table. Ids `A-<TAG>-01` and `-02`.

**Done when:** 24 rows; the fixture parses; `python scripts/eval_kb_answers.py --samples 1 --only <your ids, comma-separated>`
shows every row attaching its card (100% on "card attached"; the other columns are information, not a gate
yet). Do not commit the report.

**Report:** hash; the per-row card-attached result; any card whose facts were too vague to write a group for.

## 7. The eval runs the orchestrator makes, and what to write down

| Run | Command | Record |
|---|---|---|
| Pre-wave search baseline, 266 cards | `eval_kb_embed_models.py --arms-only` (wave 0) | The tune and holdout tables for all four arms |
| Post-A/B search run | same, after the labels and Lane B | Same tables, now with the new games' rows; and the per-question output exists |
| The sweep | `--arms-only --sweep-weights` | The pair table; the pair chosen or "none" |
| The confirmation | `--confirm-holdout <pair>` | The pair against 1:1 on the blind rows |
| Symptom-only | Lane D's 17-row table, re-run once on the landed branch | Per-row topic reached, before/after |
| Answer test, landed | `eval_kb_answers.py --samples 3` | The summary columns; compare to Lane C's "after" |
| Answer test, voice on | `--samples 3 --voice <preset>` | The same columns; a new baseline |

Every number goes in three places: this file's § 11, the roadmap entry it closes or moves, and the status
report § 3.

## 8. The Deck checks, written before the code (the QA session's brief)

**Who:** a fresh session on Opus at medium effort. **What it may do:** deploy the landed build, open the
plugin, pin test chips, press buttons, launch and exit games, read the plugin log, save evidence under
`runs/`. **What it must not do:** wipe plugin data, change the maintainer's settings without restoring them,
fix anything, run two rows at once, or guess a cause. A failed row is written down with its evidence and
handed to an Opus extra-high session; the routing table is explicit that failures are read there.

**Before the first row.**
1. Confirm the Deck is free (other chats press buttons on the same device; ask for an exclusive window).
2. Back up `settings.json` off the Deck; restore it at the end.
3. Deploy the landed build with `scripts/build.ps1`. Opening the plugin fails once after a deploy; try again.
4. Read the standing rule: **pin test chips, never type.** The orchestrator wrote every batch's exact sentences
   into this section at landing and had the maintainer confirm them all in one message; do not reword a
   sentence. A batch is 3 to 12 entries; under 3 counts as off. Pressing A on a chip fills the Ask field and
   does not submit.
5. The Deck sleeps during long pauses; the first question after a pause pays a warm-up. **Ask a throwaway
   question before timing anything.**

**Rows.** Each names its pass condition and the evidence file. "Show details" is the line under a reply.

| Row | Setup | Do | Pass when | Evidence |
|---|---|---|---|---|
| **R1 Corpus update through the plugin** | Old corpus installed | Ollama tab → *Update knowledge base* | The tab shows the new version (the release date); a game question's Show details names it; 266 cards reachable (probe if needed) | `runs/W1-R1-update.json`, plugin log tail |
| **R2 Speed skips the meaning search; Strategy pays once** (closes the owed Speed half of the recall row and starts the latency budget) | DRG Survivor running; batch of the three recall sentences | Throwaway question; then each sentence in Speed, then in Strategy | Speed: Show details reads *Keyword search* and no embed time; Strategy: *Keyword + meaning* and an embed time at or under 1.0 s on the second and third questions | `runs/W1-R2-*.json` |
| **R3 Symptom-only reach** | No game running; Speed; batch of the four blind sentences (controller, storage, crash, audio) plus *"thank you very much"* | Ask each | The four attach a tip on the right topic and Show details reads the new tip-sheet label; the thank-you attaches nothing; the embed time on the four is at or under 1.5 s | `runs/W1-R3-*.json` |
| **R4 Prompt diet on device, and the cards survive** (closes *Game notes are attached and then thrown away*) | Voice on, thinking at medium (the maintainer's own settings); Hades running; Strategy; batch: *"How do I beat the Bone Hydra in Hades?"*, *"Why does my game stutter after a few minutes?"*, plus three answer-test sentences the orchestrator picks from the fixture | Ask each; then one question with a screenshot attached; then read the plugin log | The Bone Hydra reply names Hades-specific tactics from the cards, not generic dodge advice; the log shows **no** window warning on any of the five (the clamp line may appear instead); replies keep the card's facts and the branch menu; no citation-fence text appears; the screenshot reply describes what is in the image | `runs/W1-R4-*.json`, the saved chat, the log tail |
| **R5 The twelve new games** (row KB-TRANCHE-01) | Batch of twelve: one blind question per game, taken from Lane A's rows so the eval and the device agree | Steam titles: launch the game, ask in Strategy. Emulated titles: with nothing running, ask the question with the game named in it (the title-in-question path), or launch through the emulator if time allows. Fallout: New Vegas needs the install first | For each: at least one card attaches; the credit line names the wiki and a date; the spoiler behaviour matches the title's profile; the reply is about that game and no other | `runs/W1-R5-<tag>.json` |
| **R6 The weights** (only if wave 2 changed them) | DRG Survivor running; two paraphrase questions the orchestrator picks from the sweep's per-question output — ones that flipped from miss to hit | Run the SSH probe script for each (cards cannot be counted on screen) | The right card is first | probe output |
| **R7 The five August rows** (optional, one evening) | One batch per row's sentences | As each row says in `docs/testing.md` | As each row says | as each row says |

R7 is optional. If the evening runs out, the orchestrator retires those five rows as superseded, which the
roadmap already allows.

**Wrap.** Exit any game, restore `settings.json`, list every file written under `runs/`, and append the log
to § 11 of this file: for each row, pass or fail, the reading, the file. Plain language first, numbers second.

## 9. Rules for this session

1. Everything the maintainer reads is in plain language. Code detail goes in commit messages, lane reports
   and this file's briefs, not in chat.
2. **One lane, one worktree, one concern.** A lane that needs a file outside its list says so in its report
   and stops; the orchestrator decides.
3. **Lanes never edit the roadmap, testing docs, changelog or the status report.** The orchestrator moves
   every row in one commit per landing.
4. **Blindness is a hard rule.** Lane A's rows are discarded if its report shows it read card text.
5. **No eval report is committed from a lane.** The canonical runs are the orchestrator's, on the landed
   branch, with the dates in § 11.
6. **The release pushes only on the second "go".** Build and check freely; nothing leaves the machine
   without the manifest having been shown.
7. **The Deck is not touched until wave 4**, and then by the QA session alone.
8. Check the effort a lane actually ran at when it reports; plan 32's lanes were briefed at high and ran
   at max.
9. **Keep going once a milestone verifies** (D80). The gate table in § 5 says what verified means. The only
   stop is the public push in wave 3, unless the "go" included it.

## 10. Risks, and what to do about each

- **The 266-card numbers will not match the 161-card numbers.** More cards means more to be confused by. Wave
  0's baseline exists so the comparison is 266 against 266. Do not read the first run as a regression.
- **Lane A's blindness cannot be checked by a machine.** The brief forbids the files; the report lists what
  was read; the labelling is done separately and later. That is the same protection the earlier 107 blind
  questions had.
- **The answer test is noisy by about two points.** Three samples per case, same corpus, same model, same
  PC, and no other eval running at the same time when a run is being compared.
- **The overflow only shows on a Deck-shaped prompt.** Voice on and thinking at medium are the maintainer's
  settings, not the test's defaults. Lane C's Deck-shaped runs exist for exactly this; a green PC-shaped run alone
  proves nothing about the bug. And while the voice bug is open, only the warning and token columns of those runs
  are trusted.
- **Two rules collide on Speed mode** (§ 3 call 1). The lane does not start until it is answered.
- **The sweep can say "no clear winner."** That is a finding, recorded under D68; the weights stay.
- **Shared Ollama on the PC.** Five lanes may build corpora and run evals at once; that is fine for
  correctness and slow for timing. Only the orchestrator's canonical runs are used for numbers.
- **The Deck session is long.** Twelve games to launch, one to install, and about twenty checks. Two evenings
  is realistic; R5 alone is one of them.
- **Other chats commit to the same checkout mid-session.** Numbers for plans and decisions are checked
  against the tail at the moment of writing, not at the moment of planning.

## 11. Progress log

- Tip hash at start: `37b0886`.
- Corpus version built in wave 0: `2026.09.06`, 266 notes, passed the publish check.
- Pre-wave search baseline (266 cards): the answer test kept the facts from the card 92.9% of the time, never
  contradicted a note, and attached a note every time. The search test could not tell its four search methods apart on
  the held-back questions — the ranges overlap. That is an open question, not a tie.
- Lanes launched: five.
- Landings, in order, with hashes: 72 blind search questions for the twelve new games
  (`dc263df`); 24 answer-test rows for the same twelve games (`2f564fc`); the search test's weight sweep,
  per-question card detail, and second-right-answer support (`8cf140b`); the blind questions matched to the
  notes that answer them (`2f56216`).
- **Not landed, and why.** The symptom-only troubleshooting search was built, measured and held back
  (`ccf903b`, written up as **D81**; the branch `lane/kb-symptom-search` is kept). One of its four target
  sentences improved — a controller question that used to get nothing now reaches the controller tips. The
  crash sentence still fails and now attaches a tip about desktop mode where it used to attach nothing, which
  is worse for the person reading it. The finding worth keeping: matching by meaning does not connect the words
  a person uses to describe a crash to the way the crash tips are written. That was the assumption the idea
  rested on. The fix probably lives in rewriting the tips, not the search.
- **How many of the new questions have a note behind them: 43 of 72.** The other 29 are blank. Some were
  written deliberately to have no note; most are real gaps, thinnest on the smaller games (Doom 64 has five
  notes in total). Read as a coverage number: for these twelve games, about four in ten of the things a player
  would plainly ask about are not covered yet. Blank questions are excluded from scoring.
- Sweep table and the weight call: **measured, tried, reverted — written up as D82.** Nine balances over all 266
  notes. Only one beat today's even split on both measures: counting the meaning search twice as much as the word
  search. Tuning questions (168): right note first 69.6% against 65.5%, in the top three 89.9% against 88.7%.
  Held-back questions (135), the honest test: right note first 43.0% against 37.0%, in the top three 53.3%
  against 51.9%. The direction agreed on both sets, and every range overlaps.
  **Reverted because it breaks three rules set on purpose**: a note whose meaning-index has not been built yet
  gets buried; the meaning search can push aside a note that exactly matches the words typed; and one case of
  the locked topic-preference decision stops holding. At equal weight a word-first and a meaning-first note tie;
  halve the word weight and the meaning-first note wins every tie, everywhere. That is a design call, not a
  measurement one, so it stopped. Weights stay at 1.0 / 1.0.
  **Read the held-back number carefully:** 37% against about 70% in August is the test getting harder, not the
  search getting worse — the held-back set grew from 36 questions to 135 by adding the blind questions about the
  twelve new games, which describe things instead of naming them. That is the new floor.
- Deck session, run early because the device was free: the Speed half of the recall check **passes** — all three
  sentences used a plain word search and none spent time on the meaning search. The Strategy half passes on the
  label and **fails on timing**: 1.10, 1.23 and 1.19 seconds, where the row wants the second and third at or under
  1.0. The warm-up explanation holds on the PC and not on this Deck; the third question was no faster than the
  first. Evidence in `runs/plan46-R2-speed-half.json` and `runs/plan46-R2-strategy-half.json`.
- **A before-reading for the notes-thrown-away bug, taken on the maintainer's own settings** (voice on, thinking
  medium): all three Strategy questions went over the 4,096-token window, by 703, 780 and 712 tokens. All three
  Speed questions stayed inside. After the prompt slimming lands, the same run must warn on zero.
- Answer test before / after / after-late / voice: before is the pre-wave baseline above. **After** — comparing the
  same 37 questions before and after the prompt fix landed (a single early run looked alarming on its own, so this is
  the reading across three runs together): facts kept from the note 92.9% to 91.9%, spoiler warning placed correctly
  93.3% to 97.1%, branch menu shown 100% to 98.2%, prompt length 6,930 characters down to 5,682; no question lost the
  start of its prompt across all 183 samples. Evidence `runs/plan46-R4-prompt-fix-on-device.json`. After-late, voice: —
- Release: version `2026.09.06`, 266 notes across 25 games, 124 troubleshooting tips, 1.27 MB, shipped to both
  channels and read back over the wire, matching the built file byte for byte.
- QA session log: **confirmed on the Deck 2026-09-06**, character voice on, thinking at medium, Hades running — asked
  about Megara, a boss with a note, and the answer named her dash patterns, punishing her while she recovers, and
  using boons for burst damage: real note content, not general memory. The log showed the reply budget trimmed from
  2112 to 1800 tokens so the prompt fit, and the old silent-drop warning was gone. The row's three answer-test
  sentences and a screenshot question were not run — only this mechanism check was. Evidence
  `runs/plan46-R4-prompt-fix-on-device.json`.
