# Card relevance got its second signal — pool margin, measured and shipped 2026-08-28

This closes the roadmap item *"Card relevance needs a second signal (the score alone cannot
decide)"*. The change is one gate in one function, and this file is the measurement it rests
on: what was tried, what the numbers said, and what the six D28 phrases do before and after.

## What changed, in one paragraph

The vector recall pass — the path that lets the vector half attach a card the keyword half
never found — no longer runs on the similarity floor alone. Before it admits anything, the
best card in the game must now **either stand out from the rest of that game's cards by
0.0395 cosine, or clear the floor by that same 0.0395** (`VECTOR_RECALL_POOL_MARGIN`,
`py_modules/backend/services/knowledge_base_service.py:212`; gate applied in
`_vector_recall_sections`, `knowledge_base_service.py:1010-1017`). A junk question is roughly
the same distance from everything a game knows, so its best card barely beats the pool
average; a genuine question — even a paraphrase sharing no word with its card — singles a
card out, or scores high outright. Nothing else moved: `BM25_RELEVANCE_FLOOR` stays 1.0
(D28), `VECTOR_RECALL_FLOOR` stays 0.515, the D25 type-recall rescue is untouched, and the
gate only silences cards the recall pass alone would have supplied — keyword hits and their
fusion re-ranking are unaffected.

## Why this signal and not the other two

The roadmap named three candidates and chose none. All three were measured on 2026-08-28
against the seed corpus (`build/knowledge-base-test`, manifest `2026.08.28`, 133 sections,
`nomic-embed-text` with production prefixes, local Ollama), using D28's six ordinary phrases,
the seven `V2-PARA-*` strategy paraphrase rows, the D25 short questions, and then every
labeled strategy row in `kb_eval_v2`:

1. **Score relative to the rest of the pool — chosen.** The junk phrases that clear the
   0.515 floor have pool margins of 0.0312–0.0378; nearly every genuine question sits at
   0.0412–0.1591. That gap is where the threshold lives (details below).
2. **Contains any content word after filler removal — rejected, fails outright.** All six
   junk phrases contain content words: "sentence", "time", "repeat", "team", "hours". A
   stopword test cannot tell them from real questions.
3. **Keyword/vector agreement — rejected, it is an anti-signal here.** *"what time is it"*
   has keyword hits **and** vector hits on Deep Rock Galactic: Survivor and is still junk,
   while the genuine paraphrase rows are keyword-blind by construction (that is what makes
   them paraphrases). Agreement points the wrong way on exactly the cases that matter.

## The numbers behind the two thresholds

Pool margin = top-1 cosine minus the mean cosine over all of the game's vectored sections.
Measured per question, sorted:

| Question | Kind | Top-1 | Margin |
|---|---|---|---|
| i dont understand what the objectives actually want me to do (V2-S-SOE-07, holdout) | genuine | 0.5279 | 0.0278 |
| how to play state of emergency (V2-S-SOE-01, tune) | genuine | 0.5751 | 0.0280 |
| please repeat that | junk | 0.5308 | 0.0312 |
| final arasaka tower cyborg fight (V2-PARA-S08, tune) | genuine | 0.5074 | 0.0342 |
| one sentence | junk | 0.5034 | 0.0353 |
| how to get more time (V2-S-SOE-03, tune) | genuine | 0.5486 | 0.0362 |
| thank you very much | junk | 0.4949 | 0.0369 |
| four hours | junk | 0.4595 | 0.0370 |
| what time is it | junk | 0.5326 | 0.0378 |
| gunner or scout (V2-S-DRG-06, tune) | genuine | 0.5277 | 0.0412 |
| first boss underworld roguelike (V2-PARA-S07, tune) | genuine | 0.5379 | 0.0490 |
| our team | junk | 0.4997 | 0.0523 |
| the boss (D25) | genuine | 0.5372 | 0.0665 |
| every other labeled strategy row | genuine | — | 0.0638–0.1591 |

Two honest complications, both visible in that table, and both are why the gate has two
branches instead of being a third lone number:

- **The margin ranges overlap too.** *"how to play state of emergency"* has a *lower* margin
  than any junk phrase — a broad question naming its own game is uniformly close to all of
  that game's cards, where junk is uniformly far. But its top score (0.5751) is far above
  anything junk reaches (max 0.5326). So the gate's second branch admits the pass when the
  best card clears the floor by the same 0.0395 (0.515 + 0.0395 = 0.5545 — 0.0219 above the
  highest junk score, 0.0206 below that question's).
- **"our team" has a big margin (0.0523).** The gate would let its recall pass run — and the
  0.515 floor then blocks every card anyway (its best is 0.4997). The signal is ANDed with
  the floor, not a replacement for it. Junk now has to clear an absolute bar *and* a relative
  one, which are different properties of a question; before it only needed the one.

**Threshold choice.** 0.0395 is the midpoint of the margin gap that decides real cases: junk
max 0.0378 (*"what time is it"*) vs 0.0412 (*"gunner or scout"*, a tune case whose only hit
comes through the recall pass). That clearance (±0.0017 on the margin branch, ±0.021 on the
absolute branch) is a property of today's card set, like every number in this pipeline — but
a future junk phrase now has to slip through two independent tests at once, where 0.515
alone had a one-sided clearance of 0.0011. Cases with margins *between* the branches were
checked one by one: V2-PARA-S08 (0.0342) and V2-S-SOE-03 (0.0362) get their recall gated,
and neither loses a hit — S08's target card sits below the floor anyway (0.5074), and
S03's hit does not come from recall cards (verified per-case, gate on vs off: only
V2-S-DRG-06, V2-S-SOE-01 and V2-S-SOE-07 change at all, see below).

Below `VECTOR_RECALL_MARGIN_MIN_POOL = 4` vectored sections
(`knowledge_base_service.py:220`) the gate does not run — a pool of 1–3 cards has no
meaningful "rest of the pool" (with one card the margin is identically zero and the gate
would block everything). Every seed game has 7+ vectored sections, so on the shipped corpus
the gate always runs.

## The six D28 phrases, before and after

All measured end-to-end through production functions (`_search_sections` at
`BM25_RELEVANCE_FLOOR`, `_vector_recall_sections` at `VECTOR_RECALL_FLOOR`), Deep Rock
Galactic: Survivor resolved, Strategy route, seed corpus, real embeddings. "Before" is the
same run with the gate absent, and matches the on-Deck 2026-08-23 table in
[testing.md](../testing.md) `KB-SPELLING-01` card for card.

| Phrase | Before — keyword half | Before — vector half | After — keyword half | After — vector half |
|---|---|---|---|---|
| one sentence | nothing | nothing (0.5034, below floor since D28) | nothing | **nothing** |
| thank you very much | Nitra | nothing | Nitra (off-limits, D25/D28) | **nothing** |
| what time is it | Classes, Mining and the run timer | Glyphid Dreadnought 0.5326, Praetorian 0.5279, Gold 0.5216 | Classes, Mining and the run timer (off-limits, D25/D28) | **nothing** |
| please repeat that | nothing | Glyphid Dreadnought 0.5308 | nothing | **nothing** |
| our team | nothing | nothing | nothing | **nothing** |
| four hours | nothing | nothing | nothing | **nothing** |

The vector half now supplies zero cards to all six. *"thank you very much"* and *"what time
is it"* still attach through the BM25 keyword half — exactly as D28 predicted ("option 2
fixes the half that is clearly over-reaching; it will not make those two clean"), and fixing
that half is off-limits under D25/D28.

## The eval, before and after

Same corpus, same fixture (`kb_eval_v2`, 234 rows / 153 labeled), same query embeddings,
`nomic-embed-text` prompted. Baseline run reproduced the locked D23/D28 series exactly
before anything was changed. Numbers are top-3 / top-1 for the shipping `rrf` arm:

| Slice | Before top-3 | After top-3 | Before top-1 | After top-1 |
|---|---|---|---|---|
| Labeled tune (n=117) | 91.5% | **91.5%** | 75.2% | **75.2%** |
| Labeled holdout (n=36, report-only) | 83.3% | **83.3%** | 63.9% | **66.7%** |
| Troubleshooting tips (n=48) | 75.0% | **75.0%** | 54.2% | **54.2%** |
| Keyword-blind labeled (n=3) | 33.3% | **33.3%** | 0.0% | **0.0%** |

The keyword / vector-only / rerank-only arms are identical before and after on every slice
(the gate lives only in the recall pass, which only the `rrf` arm uses). Run of record:
[archive/research/kb-embed-bakeoff-2026-08-28-arms.json](../archive/research/kb-embed-bakeoff-2026-08-28-arms.json)
(the after run; the baseline printed the identical table minus the holdout top-1 case below).

**The one number that moved is an improvement, and it was not tuned for.** Holdout top-1
gained one case: V2-S-SOE-07 (*"i dont understand what the objectives actually want me to
do"*). Its margin (0.0278) is below every junk margin, so *any* junk-blocking threshold
gates its recall — and gating it helps, because before, three noise recall cards outranked
the correct keyword hit (*Kaos mode and Revolution mode* rose from rank 2 to rank 1 once
they were gone). The holdout was looked at only after the threshold was fixed against tune
and the D28 phrases; it stays the ship gate, not a tuning input.

**D25 verified**: *"the boss"* and *"how do i beat the boss"* keep their recall cards
(margins 0.0665 / 0.0732), *"gels"* keeps its keyword cards and passes the gate (0.1224),
and the type-recall rescue path is untouched by this change.

## Tests

Five new unit tests in
[tests/test_knowledge_base_service.py](../../tests/test_knowledge_base_service.py):
junk direction (`test_pool_margin_blocks_a_question_that_singles_nothing_out`, line 983, and
`test_second_signal_keeps_a_junk_ask_unattached_end_to_end`, line 1093), genuine direction
(`test_pool_margin_lets_a_card_that_stands_out_through`, line 1014), the absolute branch
(`test_pool_margin_absolute_branch_admits_a_uniformly_strong_pool`, line 1038), and the
small-pool guard (`test_pool_margin_gate_skips_a_small_pool`, line 1066). Full suites:
`npm run test:py` 859 tests OK (3 skipped), `npm test` / `npx tsc --noEmit` /
`npm run build` all green.

## What is still owed

- **On-Deck re-check of the six phrases** — the desk table above matched the Deck card for
  card on 2026-08-23, so it should transfer, but D28's standing instruction is re-measure,
  not assume. Noted on `KB-SPELLING-01` in [testing.md](../testing.md); the frozen-chip
  Batch A wording already covers it.
- **The keyword half's two attachments** (*"thank you very much"* → Nitra, *"what time is
  it"* → Classes + Mining) remain by design under D25/D28. If they are ever to be fixed, it
  is a new maintainer call, not a floor tweak.
