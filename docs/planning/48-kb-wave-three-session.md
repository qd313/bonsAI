# 48 — Knowledge base, wave three: make the tests tell the truth, let the tip search say "none fit", and two things a player feels

Written 2026-09-07 after wave two landed, from a discovery round with the maintainer the same evening.
The answers are recorded as **D86**. **Nothing here runs until you say "go"**, with one exception you
asked for: **wave two's Deck evening runs first, now**, because the Deck is free. Two stops remain after
"go": the public push of the corrected library, and reading the answer-first numbers before anything
about the reply shape changes.

Read first: [CLAUDE.md](../../CLAUDE.md); [AGENTS.md](../../AGENTS.md) § 3; the roadmap's
[Knowledge base and RAG](../roadmap.md#knowledge-base-and-rag); the status report
[37](37-rag-status-report.md) (fourth pass); wave two [47](47-kb-wave-two-session.md), whose § 11 is
the record this wave starts from and whose § 8 is the Deck evening that runs before this plan does.

---

## Context — why this wave, and why these things

Wave two filled the library and shipped it. It also found, while measuring itself, that **the two
instruments this project decides with are both lying**. The answer test passed a reply that told a
player Pikmin 2 still has a day limit when its own note says the opposite, because the check looks for
two fixed sentences. The same test marks a right answer wrong when it uses different words. And the
search test had been quietly measuring a copy of the library from 31 August for weeks, so every search
figure older than 7 September is void. The roadmap's own instruction is: fix those before deciding
anything else from their numbers. That is the first job here and the rest of the wave is measured with
the fixed checks.

The second finding was about troubleshooting. Wave two taught the routing to stop refusing "crash" and
rewrote the tips, and the tips are much better. But of 24 problem sentences written by someone who had
not seen the rules, only 8 reach a tip. The held meaning search reaches all 24 and attaches the wrong
tip to five of them, which is worse than nothing. The cause is now known: a plain word search over 156
tips nearly always finds *something*, and there is no way for the search to say **"none of these tips
fit."** That is the second job. The maintainer's call is that when nothing fits, the person is told so
with a line, the same shape as the "not in my notes" line that shipped in wave two.

Then two things a player feels: an answer-first reply shape, tested on the PC and handed back as a
decision; and follow-ups that remember what you were just asking about. And one note that was wrong
in the library comes out and is replaced with what the maintainer checked in the game.

## 1. What is true right now (checked 2026-09-07, evening)

- **Tip `115a7a8` on `experimental`.** Tree clean. The one running the session re-reads the tip at
  wave 0 and puts the hash in every lane brief.
- **The library:** 293 notes over 25 games, 156 tips, every one with its meaning index. Release
  `2026.09.07` is live on both channels. **The Deck still has `2026.09.06`** until wave two's evening
  installs the new one.
- **One note in that release is wrong.** Black Mesa, *"Crossing the electrified waste pools"* (note
  id 271, maintainer-written, no source). It says the current arcs on a cycle with a spark as a warning.
  **The maintainer checked: the current is constant.** Stepping in deals continuous shock damage until
  you get out or die. The right advice is: treat the floor like lava and cross on desks, cabinets,
  shelves, floating crates or overhead pipes; or cut the power at a red wall switch, breaker or lever,
  usually just outside the flooded area or at the far end, which makes the water safe for good; and
  where a gap is too wide, push or carry loose wooden crates into the water as stepping stones.
- **The answer test** (`scripts/eval_kb_answers.py`, fixture `tests/fixtures/kb_answer_eval.json`, 61
  questions): facts are matched as a phrase inside the normalised reply, any of a group of alternatives;
  contradictions are matched the same way against a short list of fixed sentences. Both are
  phrase-shaped and both were caught being wrong on 7 September. It **already has a switch for the
  character voice** (`--voice`, landed 6 September), so the roadmap entry asking for one is stale; what
  is owed is a run with it on. It has a prompt-variant hook (`--variant`) that swaps text in the built
  prompt, which is how the spoiler experiments were run and how answer-first can be.
- **The search test** (`scripts/eval_kb_embed_models.py`) keeps its copy of the library under its output
  folder and reuses whatever it finds unless `--force-rebuild` is passed. The fixture
  (`tests/fixtures/kb_eval_v2.json`) has 437 questions: 221 for tuning, 216 held back. Of the 76
  troubleshooting questions, 35 are tuning rows and **41 are held back**, including the 24 blind problem
  sentences written in wave two (`V2-W2-SYM-01` to `-24`).
- **How tips are found today:** a word search over the tip sheet with a per-tip relevance floor, plus
  every tip on any topic the router matched, with **no floor at all**; the two lists are fused with the
  meaning search on top when the embedding model is present. Nothing in that path can return "nothing
  fits" once the router has matched a topic or a single word overlaps.
- **The "not in my notes" line** is one small backend module that appends a fixed line to the reply text
  when the notes cover the game, nothing matched, and the mode is Strategy or Expert. No frontend part.
  The "no tip fits" line is the same shape.
- **Follow-ups today:** the search uses the person's own words only. A chip follow-up carries the
  previous question and answer to the model, but nothing from the previous turn reaches the search, and
  a typed follow-up (*"what about the second phase?"*) carries nothing at all.
- **The held symptom search:** branch `lane/kb-symptom-search`, three commits, still merges clean. Held
  because it attaches wrong tips. It gets one more try on top of the floor and is retired for good if it
  still does.
- **The ring behind the corner icons:** measured, and the maintainer chose to do nothing. Closed.
- **Fallout: New Vegas is still not installed on the Deck.** One wave-two row needs it.

## 2. The pieces, and what a person notices

| # | Stars | Piece | What a person using the plugin notices | Lane |
|---|---|---|---|---|
| 1 | ★★★ | **The answer test catches a reply that contradicts its note, and stops marking right answers wrong** | Nothing directly. Every answer number this project quotes becomes trustworthy, and the four "thin game" failures stop looking like a content gap | A |
| 2 | ★★★★ | **The search test rebuilds its copy of the library when the notes are newer** | Nothing directly. Search numbers stop being void without anyone noticing | B |
| 3 | ★★★ | **The tip search can say "none of these tips fit"** | A problem sentence that matches no tip stops getting a wrong tip stapled on. The five sentences that got the on-screen keyboard tip for a black screen get nothing, and the line below tells them so | C |
| 4 | ★★ | **The "no tip for this" line** | *"No tip for this — this answer is from the model's own knowledge."* under a troubleshooting reply that found nothing, so a person can tell a Deck tip from a guess | F |
| 5 | ★★ | **Answer-first, tested both ways** | Nothing yet. A table comes back to you: facts kept, menu present, length, contradictions, for today's shape against tactics-first. You decide | D, then the one running the session |
| 6 | ★★★ | **Follow-ups remember, step one** | Ask about a boss, then *"what about the second phase?"* — the reply is about that boss, because the search remembers the name. Strategy and Expert only | E |
| 7 | ★★ | **A written time budget for a game question, with a check** | Nothing directly. The next slowdown fails a check instead of being caught by luck | G |
| 8 | ★ | **The Black Mesa water note is corrected** | Someone crossing the waste pools is told to stay out of the water and cut the power, not to time a cycle that does not exist | the one running the session |

Plus **one library point release** carrying the corrected note (and the "no tip" release needs no library
change — it is plugin code), and **one Deck evening** after landing, written in § 8.

Not in this wave, by the maintainer's call: spoiler tiers (a wave of its own, three days and the settings
plumbing), the prompt diet, pulling the embedding model during install, the context-window experiment,
the starting-out kind, the card style pass, and **no new notes** — the eight deliberate blanks stay blank
as the control.

## 3. The calls, answered 2026-09-07 (written up as D86)

1. **Scope:** the eight pieces above; spoiler tiers and the rest stay on the roadmap.
2. **Order:** wave two's Deck evening runs **before** wave three starts. The Deck is free.
3. **Release:** no plugin release out of this wave — close, but not yet. The corrected note is a library
   point release, pushed on a second "go".
4. **Catching a contradiction:** the cheap fix is the score (claim lists with looser, negation-aware
   matching); a second model on the PC judges each reply as a **report-only column** so we learn whether
   the judge is worth trusting before it decides anything.
5. **Old numbers:** a clean break. Before and after are re-run on the same library with the fixed
   checks; every earlier answer number is marked not comparable. (Left to the session; this is the choice.)
6. **The stale search copy:** rebuild automatically when the notes are newer than the copy.
7. **When no tip fits:** add a line, the same shape as the "not in my notes" line.
8. **The held meaning search** gets one try on top of the floor. If it still attaches wrong tips, it is
   retired for good, not held again.
9. **Answer-first:** PC numbers first, then the maintainer decides. Nothing about the reply shape changes
   in this wave.
10. **Follow-ups remember:** Strategy and Expert only. A troubleshooting question neither stores a subject
    nor picks one up; the memory only carries between two game questions. (The second half was left to the
    session; that is the choice.)
11. **No new notes.**
12. **Roles:** a fresh Opus extra-high session runs this plan; the lane helper is generalised so wave three
    does not need its own copy.
13. **The Black Mesa note is wrong and is replaced** with the maintainer's own description of the game.
14. **The ring behind the corner icons: do nothing.** Closed.

## 4. Who does what

| Role | Model and effort | Does | Never does |
|---|---|---|---|
| The one running the session | Opus, extra-high | Wave 0 prep; the note correction; briefs and launches lanes; lands every commit; runs every canonical measurement; re-tries the held branch; runs the answer-first comparison; builds and checks the point release; briefs the bookkeeper for every roadmap, testing, changelog and status-report row; writes the Deck rows | Writes lane code while a lane is open on the same files; pushes the release without the second "go"; changes the reply shape |
| Lane A | Sonnet 5, high | The answer test: contradiction check, facts matching, the judge column | Changes any prompt text; touches the search test |
| Lane B | Sonnet 5, high | The search test rebuilds its copy and stamps every report with what it searched | Touches the live search |
| Lane C | Sonnet 5, high | The floor under the tip search, tuned on the 35 tuning rows only | **Opens the 41 held-back troubleshooting rows**, the blind sentences, or plan 47 § 8; changes routing rules or the tips |
| Lane D | Sonnet 5, high | The answer-first prompt variant in the answer test | Changes the live prompt; runs the comparison for the record |
| Lane E | Sonnet 5, high | Follow-ups remember, step one | Touches prompt text, the frontend, or Speed mode |
| Lane F | Sonnet 5, high | The "no tip for this" line | Touches the search |
| Lane G | Sonnet 5, high | The time budget and its check | Touches the Deck |
| Bookkeeper | Sonnet 5, high | Roadmap, testing, changelog and status-report rows, one commit per landing | Code |
| QA session | Opus, medium | Runs the § 8 rows on the Deck, records evidence, stops on failure | Diagnoses or fixes; wipes plugin data; runs two rows at once |

**Five lanes at most at once**, so two rounds. Lane C is blind to the held-back rows for the same reason
wave two's tip lane was: whoever tunes the floor cannot see the sentences that measure it.

## 5. Order of work

### Wave −1 — wave two's Deck evening, now, before "go"

The QA session runs plan 47 § 8 on the device exactly as written there, rows **W2-R1** to **W2-R8**,
after the maintainer has confirmed the batch sentences and once Fallout: New Vegas is installed (or
row W2-R2 asks about it by name with nothing running, as the row allows). Evidence under `runs/`, the log
appended to plan 47 § 11, the rows moved by the bookkeeper. A failed row is handed to an Opus extra-high
session, not fixed by the QA session. **W2-R7 is a measurement only and now has an answer** — the
maintainer chose to do nothing — so it is run only if time allows and its reading is filed for the record.

### Wave 0 — the one running the session alone, about an hour

1. Re-read the tip; confirm the tree is clean; run the five gates; confirm the embedding model and the
   Deck's model are both present on the build machine.
2. **Correct the Black Mesa note** (id 271) from § 1's wording. One commit. If any answer-test or search-test
   row was written against the old wording, fix it in the same commit and say so.
3. **Take the starting measurement with today's checks, on a fresh copy**: the answer test over all 61
   questions, three runs; the search test with `--force-rebuild`. These are the last numbers under the
   old checks and are labelled so.
4. **Generalise the lane helper**: one `kb-lane` helper whose plan file comes from the task text, replacing
   the plan-46 and plan-47 copies. Commit.
5. Build one corpus copy for the lanes and copy it into each worktree.
6. Write the seven briefs from § 6 with the tip hash, and **run the two cheap checks** rule 10 asks for
   (see § 6, lanes C and E) before briefing those two lanes.

### Wave 1 — round one: five lanes, no Deck

Lanes **A, B, C, D, E** in their own worktrees. Land in this order as they finish: **B first** (so every
later search number is on a fresh copy), then A, then C, D, E.

### Wave 2 — round two: two lanes, launched as round one lands

**F** starts once E has landed (both touch the reply path). **G** starts any time after B.

### Wave 3 — landing and measuring, the one running the session alone

1. After A lands: **re-run the answer test before and after** — the before is the wave-0 tip with the new
   checks, the after is the landed tip. This is the clean break; every earlier number is marked not
   comparable.
2. After C lands: measure the 41 held-back troubleshooting rows and the junk phrases (§ 7). Then merge the
   held symptom branch on top in a scratch worktree and measure again. **Retire it if it still attaches
   a wrong tip.**
3. After D lands: run the answer-first comparison (§ 7) and write the table for the maintainer.
4. After each landing: brief the bookkeeper. Roadmap, testing rows, changelog, status report, one commit.

### Wave 4 — the point release, with your second "go"

Build the corrected library, check it, publish to both channels only when the maintainer says so, read
both back over the wire.

### Wave 5 — the Deck, a separate session, Opus medium

The § 8 rows.

### Milestone gates

| Milestone | Verified when |
|---|---|
| A lane has landed | Its commits are on the tip, all five gates green, its report read and its effort level noted |
| The tests tell the truth | The Pikmin reply from 7 September fails the contradiction check; the four "different words" answers pass the facts check; the search test's report names the corpus version and note count it searched |
| The floor works | On the held-back rows, wrong tips attached go down and right tips attached do not go down; *"thank you very much"* attaches nothing |
| Answer-first is measured | The table exists with both shapes on the same questions, and the maintainer has it |
| Follow-ups remember | *"what about the second phase"* after a boss question attaches that boss's note in the answer test |
| The release is out | Both channels read back and match |

## 6. Lane briefs

Every brief carries: the tip hash; the worktree path; the ancestry check; the five gates before every
commit; one change per commit, test first; report at the end with hashes, tests by name, what a person
sees, and the effort actually run at. Those are in the helper and are not repeated here.

### Lane A — the answer test tells the truth

**Files:** `scripts/eval_kb_answers.py`, `tests/fixtures/kb_answer_eval.json`, a test file for the
script's matching (create `tests/test_eval_kb_answers.py` if none exists).

1. **Facts matching.** Today a fact group passes when any alternative appears as a phrase in the
   normalised reply, so *"thin the crowd"* fails against *"keep the crowd thin"*. Replace with: strip
   filler words, reduce each word to a stem (plural, past, -ing), and pass when every content word of an
   alternative appears within a short window of the reply in any order. Write the test with the four
   pairs from the roadmap bug (*keep the crowd thin* / *thin the crowd*; *killing the mother* / *kill the
   mother*; *hurting her badly* / *hurts her badly*; and the Paper Mario one from the 7 September report)
   — all four must pass. A wrong answer must still fail: add two negative cases.
2. **Contradiction check.** Today `must_not_say` is a list of fixed sentences. Replace with claim groups
   written as the key words of the *wrong* claim, matched the same tolerant way, **and a hit only counts
   when no negation word sits within three words before it** (*no, not, never, isn't, no longer, without*).
   The test fixture is the Pikmin reply from the 7 September after-wave-two report: *"there is still a day
   limit"* must fail, *"there is no day limit"* must pass. Rewrite every existing `must_not_say` row in the
   fixture into the new shape; keep the old key name readable by the loader for one wave.
3. **The judge column.** A new `--judge <model>` switch runs a second model through the PC's Ollama over
   the note and the reply with two yes-or-no questions: does the reply contradict the note; does it state
   each fact group. **Report-only**: a column in the per-question table and a summary line, never part of
   any score. Off by default. Say in the report which model you used and how long it added.
4. Do **not** change any prompt text, any variant, or the voice switch.

**Report back** the before and after of the fixture's own 61 questions is *not* your job — the one
running the session does that. Report the tests, and any fixture row you found that no longer makes
sense under the new matching.

### Lane B — the search test rebuilds its copy

**Files:** `scripts/eval_kb_embed_models.py`, `tests/test_eval_kb_arms.py`.

1. Before reusing `corpus.db`, compare its time against `data/kb/strategy_seed.json`,
   `data/kb/compat_patterns.json` and `scripts/build_rag_db.py`. Older than any of them: rebuild, and say
   so on the console. `--force-rebuild` stays.
2. A rebuild needs the embedding model running. If Ollama is not reachable when a rebuild is needed,
   **refuse with one plain sentence** rather than running on the old copy.
3. Every report the script writes (markdown and JSON) states the corpus version, note count and tip count
   of the copy it searched, in the header, so a stale copy is visible on the page.
4. A test that a copy older than the notes file triggers a rebuild, and one that a fresh copy does not.

### Lane C — the tip search can say "none of these fit"

**Widened 2026-09-07 by D87: this lane covers the notes as well as the tips.** The
"not in my notes" line shipped in wave two cannot fire, for the identical reason a wrong tip gets
stapled on — the search has no way to say "none of these fit". Measured on the device: ten Strategy
questions about covered games, gibberish included, every one attached a note. So the floor goes on
both paths, in one lane, in two commits.

**Files:** `py_modules/backend/services/knowledge_base_service.py` — the tip path
(`_search_compat_patterns`, `_compat_tips_for_topics`, and the fusion step for the troubleshooting
domain) **and the note path** (`_search_sections` and the strategy branch of the fusion step), its
tests, and the transparency payload so "routed, nothing fit" is a distinct signal on both paths.
**Forbidden:** the held-back rows of `tests/fixtures/kb_eval_v2.json` (`split: holdout`, and every
`V2-W2-SYM-*` row), `docs/planning/47-kb-wave-two-session.md`, the compat router rules,
`data/kb/compat_patterns.json`, and `kb_not_in_notes_notice.py` (lane F's file — this lane changes
what feeds it, never the line itself).

**The cheap check (rule 10) was run 2026-09-07 before this brief, and it changed it.**
Evidence: `runs/plan48-laneC-cheap-check.json` and `runs/plan48-laneC-cheap-check-signals.json`.

- **Do not put the floor on the fused score.** On this corpus that number takes essentially two
  values — about 0.0328 when the router did not match the question's topic, about 0.0377 when it did.
  Right tips and wrong tips both appear at both. A floor there separates "the router matched" from
  "it did not" and nothing else.
- **Put it on the meaning score**, which is continuous. Across the 35 tuning rows the best right tip
  scores 0.5649 to 0.8367, the best wrong tip 0.5447 to 0.8152, and the junk phrases 0.4821 to 0.5044.
  A floor just above the junk phrases, at 0.5044, **keeps 34 of 34 right tips**. The same floor on the
  keyword score would lose 8 of them.
- **Claim only what the floor does.** It can say "none of these fit" for a question the sheet has no
  business answering. It cannot pick the right tip out of a genuinely on-topic set: right beats
  best-wrong on 20 of 34 rows by meaning and 17 of 34 by keyword. Leave the ranking alone.
- **One caution.** Only two of the six junk phrases reach the search at all, so the junk end of that
  table rests on two points. Widen it before trusting it — more phrases that should attach nothing,
  written by you, not taken from the held-back rows.

1. **Commit one, the tips.** Topic-recalled tips have no floor today. Give the fused tip
   list one, on the **meaning** score, tuned on the 35 tuning rows only. When the best tip is under it,
   **attach nothing** and record why. Where the meaning score is unavailable (no embed model, Speed
   mode, a corpus with no vectors) the floor stands down rather than guessing — say so in the report.
2. **Commit two, the notes.** The same shape on the strategy path: when the best note is under the
   floor, attach nothing. Tune on the strategy tuning rows only. This one is riskier than the tips
   because attaching a roughly-right note is often still useful, so the gate is stricter: **no drop at
   all** in right-note-attached on the tuning rows. If you cannot get "wrong down" without "right
   down", stop, keep commit one, and report the numbers.
3. The transparency block says "routed, nothing fit" distinctly from "not a question for this corpus",
   on **both** paths, so lane F and the Deck rows can read it.
4. Precision tests from wave two's tip lane must pass unchanged. *"thank you very much"* attaches
   nothing.
5. Report two tables, one per path: right attached, wrong attached, nothing attached, before and after.
   Include the four sentences below, which must all end with nothing attached once the floor is in —
   they are what the device run caught, and they are not from any held-back row:

   ```
   how do i tame a horse                     (Black Mesa running)
   where do i buy a house                    (Portal 2 running)
   qqqq zzzz wwww                            (Hades running)
   how do i beat the bone hydra in hades      (Hades running)
   ```

### Lane D — the answer-first variant

**Files:** `scripts/eval_kb_answers.py` (a new entry in the variant table), its test. **Not**
`ollama_prompts.py`.

1. Add variant `answer_first`: on a Strategy turn with a note attached and a named thing, swap the
   instruction that produces a short orientation followed by the menu for one that gives the note's
   tactics first and then the same menu. Find the exact sentence in the built prompt the way the two
   spoiler variants do; if the sentence is not stable enough to swap, say so and stop.
2. A test that the variant changes the prompt on a named-thing Strategy turn and leaves a Speed turn
   untouched.
3. Do not run the comparison for the record; the one running the session does, after lane A lands.

### Lane E — follow-ups remember, step one

**Files:** a new `py_modules/backend/services/kb_followup_memory.py`, `game_ai_request.py` (the search
words only), `knowledge_base_service.py` only if the search-words entry point needs an extra argument,
tests. **Not** the prompt text, the frontend, or Speed mode.

**The cheap check (rule 10) was run 2026-09-07 and it half-changed this brief.**

The structural half holds: the search is handed the question, the game, the resolved title, the
domain and the mode, and **nothing whatsoever from the previous turn** — there is no argument that
could carry one.

The behavioural half is not what the plan assumed. A bare follow-up already lands on something
sensible, because a type word like *phase* pulls that game's cards of that type into the pool:

| Asked, with the game running | What attaches today |
|---|---|
| how do i beat megara in hades | **Megara**, Theseus and Asterius, Heat and the Pact of Punishment |
| what about her second phase | **Megara**, Mirror of Night, Weapon aspects |
| how do i beat the glyphid dreadnought | **Glyphid Dreadnought**, Dreadnought Twins, Exploder |
| what about its second phase | Dreadnought Twins, Praetorian, **Glyphid Dreadnought** |

So in Hades — which has few boss notes — the follow-up already finds Megara first, by luck rather
than by memory. In Deep Rock Galactic: Survivor, which has several, the follow-up puts the **wrong**
boss first and the right one third.

**What this means for the lane.** The before-state is not "nothing sensible attaches". It is "the
right note attaches when the game has few of that kind, and loses to a sibling when it has several."
So do not claim the memory makes follow-ups work — claim it makes them **reliable**, and prove it on
the game where today's behaviour is wrong. The Hades pair is a weak test and must not be the only
one; the Deep Rock pair is the real one.

1. Remember, per plugin process, the last Strategy or Expert question's named thing: the named entity the
   consent detection already finds, or failing that the top attached note's name. Store the game with it.
2. A new Strategy or Expert question that has **no named thing of its own** and looks like a follow-up
   (short; begins *what about*, *how about*, *and the*, *and its*; or leans on *it*, *its*, *that*, *him*,
   *her*, *them*) gets the remembered name added to the **search words only** — never to the question the
   model is shown or the person sees.
3. Cleared when the game changes, when the library is off, or after a troubleshooting question. A
   troubleshooting question never stores or uses it. Speed never uses it.
4. Tests, all four: the boss-then-second-phase case attaches the boss's note **first** — use the
   Deep Rock Galactic: Survivor pair from the table above, where today the wrong boss wins, not the
   Hades pair, which already passes without any memory; a fresh named question is untouched; a game
   change clears it; Speed is untouched.
5. Report the same table as the cheap check, before and after, so the gain is visible as a change in
   which note comes first rather than as a claim.

### Lane F — the "no tip for this" line

**Files:** `py_modules/backend/services/kb_not_in_notes_notice.py`, `game_ai_request.py` (the call site),
tests. Starts after lane E has landed.

1. When the question was routed to the tip sheet and no tip fit (lane C's distinct signal; until it
   lands, "domain troubleshooting and nothing attached"), append:
   *"No tip for this — this answer is from the model's own knowledge."* Same footer shape as the existing
   line, any Ask mode, never when the library is off or missing.
2. The two lines never both appear on one reply.
3. Tests mirror the existing module's.

### Lane G — the time budget

**Files:** `docs/knowledge-base.md` (one short section), `scripts/probe_deck_kb_retrieval.py`, tests.

1. Read the device evidence (`runs/round34-drg-q*.json`, `runs/plan46-R2-strategy-half.json`) and write
   the budget down in plain language: time to search the notes, and time to the first word of an answer,
   with a game running. Give the figure and the evidence it comes from.
2. The Deck probe script prints pass or over-budget against it.
3. No Deck use: the check runs when the QA session runs it.

## 7. The measurements the one running the session makes

- **Answers, the clean break:** the 61 questions, three runs each, on the wave-0 tip with lane A's checks
  and on the landed tip. One extra run with `--voice` on, reported as its own column, which closes the
  stale roadmap entry. The judge column alongside, so its agreement with the fixed checks is known.
- **Tips, held-back rows:** the 41 held-back troubleshooting rows and the junk phrases, before and after
  lane C: right tip attached / wrong tip attached / nothing attached. Then the held symptom branch on top,
  same table. The retire-or-keep decision is written from that table.
- **Answer-first:** the named-thing Strategy cases, twice each way: facts kept, contradiction, menu
  present, length in words, time. A short table for the maintainer with a recommendation.
- **Follow-ups:** three boss-then-follow-up pairs added to the answer fixture by the one running the
  session (not by lane E), run three times each.
- **Search, for the record:** the search test on a fresh copy after everything lands, so wave four starts
  from a true number.

## 8. The Deck evening (the QA session's brief)

Same rules as plan 47 § 8: Opus at medium, exclusive window on the Deck, settings backed up and restored,
**batches pinned as frozen test chips and never typed**, the batch sentences **confirmed by the maintainer
before pinning**. The sentences below are drafts; they are finalised after landing and confirmed then.

**Batch W3-A — problems that reach the tip sheet and fit no tip** (with nothing running).

**These five replaced the original draft on 2026-09-07, because the draft could not test this row.**
The five sentences first written here were the ones that got wrong tips *with the held symptom branch
merged*. On the build that ships, **none of them reach the tip sheet at all** — measured, all five
return "not routed". So the row would have passed its "no tip attaches" check for the wrong reason,
and the new line could never have appeared, because the line only fires on a question that was routed
and then found nothing. A row that passes without exercising the feature is worse than no row.

These five are measured to **reach the tip sheet today and come back with a tip that does not answer
them**, which is exactly the state the floor is meant to turn into "nothing, plus the line":

```
the trackpad haptics buzz constantly in proton games
proton games launch upside down on my external monitor
shader download stalls at 99 percent every single time
the deck wakes from sleep with no wifi until i reboot
my sd card randomly unmounts while a game is running
```

What each one gets back **today**, for the before-and-after:

| Sentence | The tip it gets now | Fits? |
|---|---|---|
| trackpad haptics buzz in proton games | *"Deck sleep with Proton games: if resume fails, exit to Gaming Mode home and relaunch."* | no |
| proton games launch upside down on a monitor | *"External monitor blank: try HDMI direct, 1080p60, disable overscan."* | no — blank is not upside down |
| shader download stalls at 99 percent | *"Shader pre-cache missing: first launch stutters until cache builds."* | no |
| wakes from sleep with no wifi | *"Verify AC adapter wattage; weak USB-C hubs can throttle charge and TDP during play."* | no, not remotely |
| sd card unmounts mid-game | *"Move library to SD: Steam Settings > Storage; move per game."* | no |

Two more that reach the sheet were left out on purpose because their tip half-fits, so they cannot
give a clean verdict: the controller one (*"my controller keeps disconnecting from the dock"*) and the
wired-headphone one (*"audio crackles only when the headphones are plugged into the dock"*, which gets
a Bluetooth tip).

**Batch W3-B — problems that fit a tip** (nothing running; the eight from wave two's batch R4 that reach a
tip, reused).

**Batch W3-C — follow-ups** (Hades running, Strategy):

```
how do i beat megara in hades
what about her second phase
how do i beat the bone hydra in hades
what about its second phase
```

**Batch W3-D — the corrected note** (Black Mesa named, nothing running, Strategy):

```
black mesa how do i get across the electrified water
```

| Row | Setup | Do | Pass when | Evidence |
|---|---|---|---|---|
| **W3-R1 Install the point release** | Previous library installed | Ollama tab → *Update knowledge base* | The tab shows the new version; a Black Mesa question's Show details names it | `runs/plan48-R1-*.json` |
| **W3-R2 No tip, and the line says so** | Nothing running. Batch W3-A, Speed | Ask each | **Each was routed to the tip sheet** (Show details must say so — if it says "not a troubleshooting question", the sentence is wrong, not the feature); no tip attaches; the reply ends with the "No tip for this" line, exactly worded; Show details says no tip fit | `runs/plan48-R2-*.json` |
| **W3-R3 A tip still attaches when one fits** | Nothing running. Batch W3-B, Speed | Ask each | A tip on the right subject attaches; **no** "No tip for this" line | `runs/plan48-R3-*.json` |
| **W3-R4 Follow-ups remember** | Hades running, Strategy. Batch W3-C | Ask in order | The second and fourth attach the note of the boss just asked about; the question shown is unchanged; Show details shows the remembered name in the search | `runs/plan48-R4-*.json` |
| **W3-R5 The corrected note** | Batch W3-D | Ask | The reply says the current is constant, stay out of the water, cross on high ground or cut the power; nothing about a cycle | `runs/plan48-R5-*.json` |
| **W3-R6 The time budget** | A game running, Strategy | Run the Deck probe script three times | Every reading inside the written budget | `runs/plan48-R6-*.json` |

## 9. Rules for this session

1. Everything the maintainer reads is in plain language. Code detail goes in commit messages, lane reports
   and the briefs above.
2. **One lane, one worktree, one concern.** A lane needing a file outside its list says so and stops.
3. **Lanes never edit the roadmap, the testing docs, the changelog or the status report.** The bookkeeper
   does, one commit per landing, briefed by the one running the session.
4. **Blindness is a hard rule.** Lane C's floor is discarded if its report shows it read a held-back row.
5. **No eval report is committed from a lane.**
6. **The library pushes only on the second "go".** Nothing about the reply shape changes without the
   maintainer reading the answer-first table.
7. **The Deck is not touched until wave 5**, and then by the QA session alone. (Wave −1 is wave two's
   evening and is the QA session's too.)
8. Check the effort a lane actually ran at when it reports.
9. **Keep going once a milestone verifies.** The gate table in § 5 says what that means.
10. Any lane whose value rests on an unproven assumption gets that assumption tested cheaply before the
    lane is briefed. Two such checks are named in § 6 (lanes C and E).
11. **Land B before any search number is quoted.** A number taken on a stale copy is void, and this wave
    exists partly because nobody noticed for weeks.

## 10. Risks, and what to do about each

- **The new checks move every number at once**, and it will be tempting to read the move as a change in
  the plugin. It is not. The clean-break run in § 7 is before and after on the *same* tip, and only the
  after-landing run compares plugin against plugin.
- **A negation-aware check can be fooled** by *"not only is there a day limit"*. The lane adds that case
  as a known miss in the test file rather than chasing it; the judge column is the second opinion.
- **The judge model has its own errors.** That is why it is report-only. If it disagrees with the fixed
  checks on more than a handful of rows, the rows are read by a person before anyone trusts either.
- **An absolute floor may not separate right tips from wrong ones.** The cheap check finds out before the
  lane is briefed. If nothing separates them, the finding is filed and the "no tip" line still ships, it
  just fires less often.
- **The floor may cost right tips.** The gate is "wrong attached goes down and right attached does not";
  a floor that loses a right tip for every wrong one it stops is not taken.
- **Follow-up memory can attach the wrong note** when someone changes subject without naming it. The
  follow-up shape test is deliberately narrow; a question that names anything at all uses no memory.
- **Two lanes touch the reply path** (E and F). F starts only after E lands.
- **The point release and the Deck evening both need the Deck**, and other chats press its buttons. One
  driver at a time; ask for the window.
- **Fallout: New Vegas** may still not be installed for wave −1. The row allows asking by name.

## 11. Progress log

### Wave −1 — wave two's Deck evening, done 2026-09-07

Run by this session rather than a separate checking session, because the Deck was free and the
maintainer asked for it. **The log lives in plan 47 section 11**, where the rows are. In short: R1,
R2 and R3 pass, R4 partly passes, **R5 and R6 fail**, R7 was already closed.

The R5 failure changed this wave. It is written up as **D87** and lane C now covers the notes as
well as the tips.

### Wave 0 — done 2026-09-07

**Tip when the wave started: `44d8b8f`** on `experimental`, tree clean apart from untracked evidence.

**All five gates green before anything was touched:** typecheck, 1,123 frontend tests, the Python
suite, a clean build, and the focus check at its baseline of 74.

**Both models present** on the build machine: `nomic-embed-text` and `gemma4:e2b-it-qat`. The Deck
runs its own Ollama at 127.0.0.1 with four models.

**The Black Mesa note is corrected** (`a72ecef`). The old note said the current arcs on a cycle with a
spark as a warning and told the player to move while the water is dark. The maintainer checked the
game: the current is constant, and stepping in deals continuous damage until you get out or die. The
new note says to treat the flooded floor like lava and cross on desks, cabinets, shelves, floating
crates or overhead pipes; or cut the power at a red wall switch, breaker or lever, usually just
outside the flooded area or at its far end, which makes the water safe for good; and to push loose
wooden crates in as stepping stones where a gap is too wide. The note keeps its name, so the one
search row that names it (`V2-T1-BMS-05`) still works.

**The lane helper is generalised.** There is one `kb-lane` now and it takes its plan file from the
task text. The wave-two copy is gone.

**The starting measurements, taken with today's checks on a freshly built library** — these are the
last numbers under the old checks and are labelled so.

| | Reading |
|---|---|
| Answers, 61 questions, three runs each | facts kept 73.1% · never contradicts its note 100% · spoiler line never misfired 100% · spoiler line appeared when due 77.8% · branch menu when due 97.1% · a note attached whenever one was due 100% · **65.6% of questions clean on all three runs** · about 1,866 tokens of prompt · no question overflowed the window · 4.7 minutes |
| Search, on the questions nobody tuned against, top three | meaning-only 88.5% · keyword 78.8% · blended-then-reranked 82.1% · **blended 84.0%** — the intervals overlap, so this set still cannot tell the four apart |

The "never contradicts its note — 100%" figure is the one lane A exists to fix. It is recorded here
so the clean break in wave 3 has a before.

**Both cheap checks (rule 10) were run before briefing, and both changed a brief.** They are written
into the lane C and lane E briefs in section 6, and the numbers are in D87. In short:

- **Lane C:** the floor cannot go on the fused score, which takes only two values on this corpus. It
  goes on the meaning score, where a floor just above the junk phrases keeps 34 of 34 right tips.
- **Lane E:** a bare follow-up already lands on the right note when a game has few bosses, and on the
  wrong one when it has several. The lane's claim is reliability, not capability, and its test has to
  be the Deep Rock pair rather than the Hades pair.

Evidence: `runs/plan48-laneC-cheap-check.json`, `runs/plan48-laneC-cheap-check-signals.json`.

### Waves 1 and 2 — all seven lanes landed 2026-09-07

Five gates green after every landing. Landed in the order the plan asks: **B first**, then E, A, C,
then F and G.

| Lane | What landed | Effort it ran at |
|---|---|---|
| A | The answer test stops passing contradictions and stops marking right answers wrong; a second model's opinion as a column | Sonnet 5, high |
| B | The search test rebuilds its own copy and stamps every report with what it searched | Sonnet 5, high |
| C | Both searches can say "none of these fit" | Sonnet 5, high |
| D | The answer-first prompt variant, for measuring only | Sonnet 5, high |
| E | Follow-ups remember what you just asked about | Sonnet 5, high |
| F | The "No tip for this" line | Sonnet 5, high |
| G | The time budget, written down, with a check | Sonnet 5, high |

### The clean break — every earlier answer number is void

The 61 questions, three runs each, with the corrected checks, on the wave-0 plugin and on the landed
one. **Both columns use the same checks**, so the difference is the plugin and nothing else.

| | Wave-0 plugin | Landed |
|---|---|---|
| Facts kept | 74.9% | **76.6%** |
| Never contradicts its note | 94.4% | 94.4% |
| Spoiler line never misfired | 98.8% | 98.8% |
| Spoiler line when due | 77.8% | 77.8% |
| Branch menu when due | 97.1% | **98.6%** |
| A note attached whenever one was due | 100% | 100% |
| Clean on all three runs | 60.7% | 60.7% |

**The headline: "never contradicts its note" was reported as 100% and is really 94.4%.** Three
replies in fifty-four contradict the note they were given. All three are the same question — the
Pikmin 2 day limit — and it fails on every run. This wave's changes are about neutral on answers,
which is expected: it changed the search and the tests, not the prompt.

### The contradiction check over-fired on its first real run, and was fixed

The first run reported seven contradictions. Read by hand, **only three were real.** The other four
were the check misunderstanding replies that were giving the right advice:

- A Black Mesa reply — *"Avoid shooting at the shell. Up close, its front legs can deal significant
  damage."* The claim watched for was *"shoot the legs"*, and the check joined "shooting" in one
  sentence to "legs" in the next, when both sentences say the opposite.
- A DOOM Eternal reply, three runs of it — *"If you get too close, it will draw your super shotgun
  faster than you can dash."* The claim was *"get in close"*. The word "too" inverts a claim the way
  "not" does.

Claims are now matched one sentence at a time, and "too" blocks a match like a negation. Both replies
are tests, along with the reverse case so the check cannot be loosened into uselessness. That moved
the figure from a false 87.0% to 94.4%, which matches the hand count exactly.

**This is worth remembering.** A check that over-reports contradictions is as bad as the one that
reported none, because that number is what the project quotes about whether its answers can be
trusted. A new check's first real run gets read by a person, row by row, before its number is quoted.

### The floor: what it does and does not do

Measured on the rows lane C was blind to, before and after.

| | Before | After |
|---|---|---|
| Held-back troubleshooting rows: right tip / wrong tip / nothing | 14 / 1 / 2 | 14 / 1 / 2 |
| Held-back note rows: right / wrong / nothing | 90 / 24 / 25 | 89 / 24 / 26 |
| Twelve phrases that should attach nothing | 0 attach | 0 attach |
| The four device questions with no note on the subject | 4 attach | **4 attach** |

**Read the totals alone and this looks like a net loss, and it very nearly was thrown away on that
reading.** The row-by-row comparison says the opposite. Six confident non-answers were removed —
*"githyanki patrol too hard"* was being answered with a note about Sneak Attack, *"hl2 speedrun route
skips"* with a note about Ravenholm, two more with a generic fallback card — against one right answer
lost, a Hades build question.

The totals could not show that because **six of those six rows record no correct answer in the test
set**, so removing a bad attachment from them moves no counter at all. The measurement script now
prints the row-by-row change and says which rows can never move a counter.

**What the floor does not fix.** The four questions that caused D87 still attach notes. Catching them
would cost twenty or more correct answers elsewhere, and the lane refused that trade, which was the
right call under its gate. So the "not in my notes" line fires more often than it did, and still not
on those four. That limit stays open.

**And lane F's line inherits it.** Lane F tested its trigger against about twenty troubleshooting
sentences on the real library and it did not fire once before the floor landed — every sentence that
reached the tip sheet got something attached. The line is wired correctly and now has something to
fire on, but how often a person actually sees it is unmeasured on the device.

### The search got slower and nobody noticed

Lane G read the device evidence for the time budget and found the same three questions timed three
times: **793–900 ms in August, 1078–1094 ms one September evening, 1103–1230 ms the next.** About
thirty per cent slower since August, steadily.

The explanation given at the time — that only the first question after a quiet spell is slow — **does
not hold on the Deck.** It is true on the build machine (1.47 s, then 0.05 s) but on the device three
questions in a row came back within 16 ms of each other. The budget is written down at one second and
the probe prints pass or over-budget; every reading in hand would print red today. That is the check
working, not a fault in the check.

Time to the first word of an answer has no clean device reading, and the document says so rather than
inventing one.

### Still owed

- **The Deck evening (§ 8)**, not started. The device went back to the maintainer partway through
  wave two's evening.
- **Wave two's R6 half** about the stray line of computer text.
- **A device reading** of time to the first word of an answer.
- **Why the search got slower since August.**
- **The four questions the floor cannot catch.**
- **The held symptom branch** has not been re-tried on top of the floor.

### Answer-first, measured — a decision for the maintainer

The same 61 questions, three runs each, same corrected checks, same landed plugin. The only
difference is the instruction that decides whether a reply opens with a short orientation and then
gives tactics, or gives the tactics first. **Nothing a person sees has changed** — this is a
measurement of a shape we have not shipped.

| | Today's shape | Tactics first |
|---|---|---|
| Facts kept | 76.6% | **79.5%** |
| Never contradicts its note | **94.4%** | 90.7% |
| Spoiler line appeared when it was due | 77.8% | **88.9%** |
| Spoiler line never misfired | 98.8% | **99.4%** |
| Branch menu present when due | **98.6%** | 97.1% |
| A note attached whenever one was due | 100% | 100% |
| Clean on all three runs | 60.7% | **67.2%** |
| Words per reply | 103 | **91** |
| Seconds per reply | 1.3 | **1.2** |

**Reading it plainly.** Tactics-first is better on almost everything a person would notice: it keeps
more of the note's facts, it is twelve words shorter, it is no slower, it hides spoilers when it
should far more reliably, and a whole question comes out clean on all three runs six points more
often. The branch menu is very slightly less reliable.

**The one thing against it, and it is worth looking at before deciding.** Contradictions get worse,
94.4% to 90.7%. But that is not spread out — it is one extra question, and both failing questions are
the same topic: the Pikmin 2 day limit. Today's shape fails one of them on all three runs;
tactics-first fails that one and also fails its neighbour on two runs of three. So the honest reading
is not "tactics-first contradicts notes more often" but "tactics-first is worse on the one topic the
model already gets wrong". That topic is the same one the whole contradiction check was built around.

**Recommendation: take it, and fix the Pikmin notes either way.** The gain is broad and the loss is
one known-bad topic that is already an open problem. But this is the maintainer's call, and nothing
about the reply shape changes until they make it.

### The late sitting, 2026-09-07

The maintainer read the table above and took tactics-first the same evening; it shipped. Four of
§ 8's device rows ran late that evening, before the rest of the Deck evening could be finished.

- **W3-R1, install the point release: passed.** The corrected library installed from the plugin's
  own button, and a Black Mesa question named the new version.
- **W3-R4, follow-ups remember: half pass.** The pair actually asked was Deep Rock Galactic:
  Survivor's Glyphid Dreadnought. The looking-up half works — the right boss's note moved from third
  place to first once the memory was in. The answering half fails — the reply named a different
  boss, because a better-matching wrong note was still attached one place below the right one.
- **W3-R5, the corrected Black Mesa note: passed.** The reply said the current is constant, told the
  player not to try to time it, and pointed at the wall switch that cuts the power.
- **W3-R6, the time budget: failed.** The check itself gives a false all-clear — it read 23 to 38
  thousandths of a second for the search and printed pass, while a real question on the same Deck in
  the same sitting took 1.07 seconds for that same step and would have printed over budget.

The rest of § 8 — W3-R2, W3-R3 and W3-R7 — did not run this evening.

### The rest of the device evening, 2026-09-15

The maintainer freed the Deck to finish what § 8 left. The build deployed first was the refactor tip
`2ed236f`, so this doubles as the device check phase 5 of the refactor never had. **The panel mounted, asked
and answered normally throughout** — twelve questions end to end, no crash, no missing control.

- **W3-R7, the honesty line: PASS.** Three sentences, three fresh chats. *qqqq zzzz wwww* and the bone hydra
  question with Hades running both carried the line once, worded exactly as agreed, below the answer. The
  Deep Rock Galactic: Survivor control carried none. The D-pad walk below the line was run in full — fourteen
  presses, every stop reached, no cycles, nothing under the line stranded.
- **W3-R3, tips still attach when one fits: PASS.** Seven problem sentences and the control, nothing running,
  Speed, one fresh chat. Every one of the seven attached a card from the shared tips; the control attached
  none; the *No tip for this* line appears nowhere in the saved chat. Which tip each got was measured
  separately with the retrieval probe, because Show details names the shelf and not the card: performance,
  audio, storage, display, performance, performance, updates.
- **W3-R6, the time budget: PASS, three runs.** 547, 23 and 28 ms against 1000. The fixed check refuses a
  reading taken without a reply first. **Read it with the range in mind** — 547 on the first run, 23 and 28
  after, and 794 on 12 September. The number tracks what is loaded in memory more than anything else.
- **W3-R2, the *No tip for this* line: still blocked, now with device evidence.** All seven of R3's sentences
  attached a tip on the Deck, so none of them can show the line. The block is real, not a measuring artefact.

**The wrong-game menu is solved, and the guess in the roadmap was wrong.** It appeared twice more, both times
in brand new chats — once on the first question of an empty chat — so carried-over turns are not the cause.
The two options it offers are word for word the worked example in the instructions the model is given, which
demonstrates the shape using Half-Life 2, the train station and Ravenholm, and then tells the model never to
copy that wording. It copies it anyway. Filed with the cause; not fixed, because this was a checking session.

**Two other open bugs got fresh device evidence.** The panel still learns the running game only at start-up:
switching games left the old name under the question box for minutes while the chat slot beside it showed the
new one correctly. And the highlight trap that this project has never managed to reproduce on demand was
reproduced twice, both times seconds after starting an empty chat while a Session context row was on screen.

**One cost worth stating plainly: three of the maintainer's older chats were lost.** The list holds eight,
and starting three new ones for this evening pushed three out with no warning — a vac-check chat, an echo
test, and a Red Dead Redemption 2 question. All three are in the copy taken before anything was touched, at
`~/qa-backups/settings-20260915-kb-evening` on the Deck, and can be put back. Settings themselves were
checked byte-for-byte against that copy at the end and are unchanged, pinned test chips included.

Evidence `docs/test-evidence/plan48-deck-evening-2026-09-15.json`,
`docs/test-evidence/plan48-W3R7-walk-below-the-line-2026-09-15.json`,
`docs/test-evidence/plan48-BUG-ask-input-ring-trap-2026-09-15.json`.
