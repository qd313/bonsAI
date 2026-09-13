# Vector recall pass — floor measurement

**Measured 2026-08-18 on PC** (`nomic-embed-text:latest`, local Ollama, corpus
`build/knowledge-base-test/corpus.db` = the published 13-title / 117-section artifact,
`embedding_variant: nomic-prefixed-v1`). Evidence for `VECTOR_RECALL_FLOOR` and
`VECTOR_RECALL_K` in
[knowledge_base_service.py](../../py_modules/backend/services/knowledge_base_service.py).

Fixes the bug measured on Deck 2026-08-17: *"Hybrid retrieval's vector half adds no recall —
it only re-orders what BM25 already found."*

---

## 1. What was wrong

Every candidate came from one FTS query, and vectors were then loaded **for those candidates
only** (`_load_section_vectors(conn, [c.section_id for c in cards])`). The guard was
`if nomic_ready and cards:`, so when BM25 returned nothing, no embedding was computed at all
and a semantically perfect card was unreachable. RRF re-ranked a keyword shortlist; it was not
a fusion of two recall paths.

This is also what Phase 7's locked ranking blend already asked for — *"when FTS is empty/weak,
meaning fallback ... vector/ANN list into RRF"* ([knowledge-base.md](../knowledge-base.md)
§ Phase 7) — so the change implements a locked decision rather than introducing one.

## 2. Method

For each question: embed with the production prefix (`format_embed_query`), score **every**
section of the resolved game with `_dot_similarity`, and record the cosine of the card a human
says is correct. Two groups:

- **relevant (15)** — questions paraphrased away from the card's wording, 4 titles
  (DRG Survivor, Portal 2, Half-Life 2, Hades), each with one known-correct card.
- **off-topic (12)** — questions that are not about the game at all, asked while it runs.

Script: `measure_vector_floor.py` (scratchpad, not shipped — reproduce by scoring
`_vector_recall_sections` over a game with a query embedding).

## 3. Result — the distributions overlap

| group | min | max |
|---|---|---|
| cosine of the **correct** card, paraphrased question | **0.519** | 0.738 |
| best cosine any card scored on an **off-topic** Ask | 0.435 | **0.593** |

Worst relevant (0.519) sits **below** best off-topic (0.593). **No absolute floor separates
them.** Five relevant and three off-topic cases fall in the 0.519–0.593 band.

Worst relevant: *"the robot with the little eye that talks a lot"* → Wheatley (0.519).
Best off-topic: *"how much ram does the steam deck have"* → HL2 Strider (0.593).

The correct card was at vector **rank 1 for 10 of 15** and within **rank 3 for 14 of 15**. The
exception (*"how do i take down the big three legged walker"*, rank 7) already had three
keyword candidates of its own.

## 4. A shape-based rule was tried and rejected

If absolute cosine will not separate, the distribution's *shape* might: require the card to
stand out from that game's own scores (z-score over the game's sections). It does not.

| threshold | keeps correct card | lets an off-topic Ask in |
|---|---|---|
| z ≥ 1.0 | 12/15 | **12/12** |
| z ≥ 1.2 | 11/15 | 9/12 |
| z ≥ 1.6 | 7/15 | 5/12 |

z(top) for off-topic Asks ran **1.10–2.32** against 1.10–2.42 for relevant ones — total
overlap. With 5–13 cards in a game, *something* always stands out, so "stands out" carries no
information about whether the Ask is about the game. Rejected: no better separation, one more
moving part.

**The conclusion that matters:** whether an Ask is about the game is a **routing** question,
not a retrieval one. No per-query similarity statistic answers it. So precision on this path is
carried by the route gate — the pass runs only on the **explicit** route, where the user
declared the Ask to be about the game — and the floor only has to be good enough to reject
noise, not to do the routing.

## 5. Constants chosen

**`VECTOR_RECALL_FLOOR = 0.50`.** Below every relevant hit in the sample (min 0.519); rejects
4 of 12 off-topic ones. Deliberately loose, because of what it is measured against: on the
explicit route, the alternative when BM25 finds nothing is `_genre_fallback` — a generic genre
card with no relation to the question. Observed for real: *"what is the capital of peru"* with
DRG Survivor running attaches **"Soulslike basics: learn dodge timing…"**. A card at cosine
0.52 is weaker evidence than a keyword hit and stronger than that.

Do not tighten above 0.55 without re-measuring: two of the four failures this fixes score
**0.542** and **0.523**.

**`VECTOR_RECALL_K = 3`.** Bounds what a wrong recall costs — an off-topic Ask can add at most
three cards, and Strategy's budget only spends three. Not a recall limit in practice (§3: 14 of
15 correct cards sit within rank 3).

## 6. Paired bake-off — `kb_eval_v2`, 98 labeled strategy rows

Same corpus, same query embedding per case, so any difference is the recall pass alone.

| arm | top-1 | top-3 |
|---|---|---|
| current (re-rank only) | 83.7% | 95.9% |
| **+ vector recall** | 83.7% | **100.0%** |

**Zero regressions**: no case that was in top-3 before fell out. Four cases gained:

- `V2-S-DRG-06` *"gunner or scout"* — **BM25 found nothing**; recall found `Classes`.
- `V2-S-DRG-08` *"when to leave the level"* → `Mining and the run timer`
- `V2-S-BG3-01` *"best class for first playthrough"* → `Party composition`
- `V2-S-SOE-01` *"how to play state of emergency"* → `Kaos mode and Revolution mode`

Top-1 moved on exactly two rows, one each way, both in the same 5-section title
(`V2-S-SOE-01` gained #1, `V2-S-SOE-07` lost #1 but stayed in top-3) — net zero, and at
n=98 a single row is not a signal.

## 7. Not measured here

- **On-Deck timing.** The embed round trip was 793–900 ms on Deck (2026-08-17) versus ~28 ms
  against a PC Ollama here. The recall scan itself is a few hundred dot products over one
  indexed query and is not the cost; the embed is, which is why the route gate matters.
  → **KB-RECALL-01**.
- **Real user phrasings.** The 15 relevant questions were written for this measurement, not
  drawn from usage. `kb_eval_v2` (§6) is the maintainer-reviewed set and it agrees, but both
  are authored fixtures.
- **Compat tips.** The same structural flaw exists on the compat path and is untouched here —
  it belongs with the open bug *"Compat retrieval returns a tip from the wrong topic"*, whose
  fix (feed the D16 matched topic into the search) changes the same function.
- **Expert mode.** Expert is on the implicit route today, so it gets no recall pass. That is
  the open bug *"Expert mode attaches fewer knowledge cards than Strategy"*; both are keyed off
  the same `implicit_route` flag on purpose, so fixing it widens both at once.
