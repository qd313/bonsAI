# What 13 new cards did to retrieval — measured 2026-08-31

Run: `python scripts/eval_kb_embed_models.py --arms-only --force-rebuild`.
Report: [kb-embed-bakeoff-2026-08-31-arms.md](../archive/research/kb-embed-bakeoff-2026-08-31-arms.md).
Corpus 133 → 146 sections across four commits (ten re-types, six State of Emergency cards, the
Half-Life 2 antlion split, the Hades weapon split).

## Read the tune table with care — it is not comparable to 2026-08-29

Tune top-1 appears to fall 75.2% → 63.1%. **Almost none of that is the cards.** The tune split
gained 51 blind rows after the 08-29 run, so the two tables score different fixtures, which R4
forbids comparing. Scoring only the 117 cases both runs share:

| Split | Cases | top-1 | top-3 |
|---|---|---|---|
| tune | 117 (shared) | 75.2% → **70.9%** | 86.3% → **85.5%** |
| holdout | 92 (unchanged) | 51.1% → **48.9%** | 70.7% → **70.7%** |
| all | 209 (shared) | 64.6% → **61.2%** | 79.4% → **78.9%** |

The other 12 points are the new rows being **hard on purpose**: those 51 blind rows score 45.1%
top-1 / 70.6% top-3 on their own. Written without reading the cards, they share no vocabulary with
them — that is the entire point of D37, and a low score on them is the method working.

## What the cards actually cost

**Consistent, small, and concentrated in first place.** On identical cases the keyword arm loses
about 3 points of top-1 and half a point of top-3, and every one of the four arms moved the same
direction on holdout — keyword −2.2, vector −1.1, rerank-only −2.2, rrf −2.2 top-1. On `rrf`, the
arm that actually ships, holdout top-3 went 79.3% → 78.3%: **one case out of 92.**

So the shape is: more cards push things off the **#1** slot without pushing them out of the top 3.
That is what a denser corpus does, and top-3 is what the reply actually receives.

Per case, on the keyword arm, across the 209 shared cases: **7 regressed, 0 improved.** Zero
improvements is not surprising — no eval row existed for any subject the new cards cover, apart
from the three that were repointed. The corpus grew into questions nobody has asked yet.

## The seven, and why three of them are the fixture's fault

| Case | Split | Expects | Now returns first | Read |
|---|---|---|---|---|
| `V2-S-SOE-03` *"how to get more time"* | tune | Kaos mode and Revolution mode | **Round time and the +15s pickups** | retrieval is **right**, label is stale |
| `V2-S-SOE-09` *"chaos mode high score"* | holdout | Kaos mode and Revolution mode | **Causing chaos** | arguably right |
| `V2-S-SOE-07` *"i dont understand what the objectives actually want me to do"* | holdout | Kaos mode and Revolution mode | Grenade launcher | genuinely worse |
| `V2-S-HL2-06` *"…cant touch the sand and i keep dying"* | tune | Antlions | **Sandtraps** | defensible either way |
| `V2-S-HL2-08` *"antlions how to control them"* | tune | Pheropod (bugbait) | **Antlions** | defensible either way |
| `V2-S-RDR2-02` *"horse keeps dying"* | tune | Horse bonding | Bear | collateral, see below |
| `V2-S-HADES-02` *"which weapon is easiest"* | tune | Stygian Blade | Weapon aspects | **the one real regression** |

Six of the seven still land inside the top 3. Only Hades falls out entirely.

**Three of the seven are State of Emergency rows that all expected the same catch-all card.** When
that game had five cards, `Kaos mode and Revolution mode` was the only thing resembling an answer to
half its questions. It now has eleven, and the maintainer's own gap-sheet answer — *"they don't know
when to focus on adding time to a round via +15s pickups"* — produced a card that answers *"how to
get more time"* better than the catch-all ever did. **The retrieval improved and the score went
down**, because the fixture allows exactly one right answer per question.

**`V2-S-RDR2-02` is the one to notice**, because no Red Dead card was touched. BM25 scores a
document against the statistics of the **whole index**, so adding cards to State of Emergency and
Hades changes what rare words are worth everywhere, including Red Dead. Corpus growth is not
sandboxed per game, and any future depth work should expect this.

## Nothing was changed in response to these numbers

No card was reworded and no label was repointed after seeing this. That is the whole discipline:
`V2-S-SOE-07` and `V2-S-SOE-09` are **holdout** rows, and editing a holdout label because it scored
badly converts the ship gate into a mirror. They stay wrong, and the fixture stays honest.

## Two questions this raises, both for the maintainer

Written up as **D40** and **D41** in
[maintainer-decisions-locked.md](maintainer-decisions-locked.md). In short:

1. **One right answer per question is now too few.** Five of the seven regressions are cases where
   more than one card is a fair answer. The fixture cannot express that, so growing the corpus
   mechanically lowers the score.
2. **`Weapon aspects` beats `Stygian Blade` for *"which weapon is easiest"*** because it contains
   the word *weapon*. The fix is not to reword either card to match the question — that is fitting
   to the test. The question is whether a card whose name is a category term should exist beside
   cards that are instances of it.
