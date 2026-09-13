# Compat topic preference — measurement record

**Measured 2026-08-18 on PC** (corpus `2026.08.16`, `nomic-embed-text`, local Ollama).
Evidence for `RRF_W_TOPIC` and for **not** shipping a compat vector recall pass. Implements
**D22**; extends **D16**.

Fixes the bug measured on Deck 2026-08-17: *"Compat retrieval returns a tip from the wrong
topic."*

---

## 1. The premise in the bug report was half right

The report said ten relevant `steam_input` tips *lost* to a gamescope tip on a lexical match.
They did not lose. **They were never candidates.**

| KB-ROUTER-01 sentence | routed topic | tips on that topic | how many the keyword search found |
|---|---|---|---|
| out of room, installs on the memory card | `storage` | 8 | **0** |
| responds to the touchpad, ignores the sticks | `steam_input` | 10 | **0** |
| play alone but online kicks me out | `anticheat` | 8 | 1 (at rank 1) |
| playstation 2 games run at half speed | `emudeck` | 2 | **0** |

The questions share no vocabulary with the tips that answer them. **This is why a ranking
preference alone could not have fixed it** — there was nothing in the list to prefer. The
matched topic had to open a recall path first, and only then act as a preference.

## 2. What shipped

1. **Topic recall.** `_compat_tips_for_topics` pulls the tips on the routed topics into the
   pool with no keyword gate at all (`COMPAT_TOPIC_RECALL_K = 6`).
2. **Flat preference in fusion.** Cards on a routed topic get `RRF_W_TOPIC / (RRF_K + 1)`.
   Flat, not rank-based: "the router matched this topic" is a yes/no fact with no internal
   ordering to express. Ordering comes from the keyword and cosine lists.
3. **A keyword-only path.** `_merge_preferred_first` gives the same on-topic-first ordering
   when no embed model is installed, so the fix does not depend on Ollama having `nomic`.

## 3. Why `RRF_W_TOPIC = 0.30`

Swept on the **tune** split only; holdout untouched (R1).

| weight | tune top-3 | KB-ROUTER-01 first tip on topic |
|---|---|---|
| 0.00 (today) | 22/27 (81%) | 1/4 |
| 0.15 | 25/27 | 3/4 |
| **0.30** | **27/27** | **4/4** |
| 0.50 | 27/27 | 4/4 |
| 1.00 | 27/27 | 4/4 |
| 2.00 | 27/27 | 4/4 |

0.30 is the **weakest** setting that clears the bar, which is the setting D22 asks for: the
decision was *preference*, so the right weight is the smallest one that works, not the largest
one that scores. Nothing above 0.30 buys anything measurable, and everything above it moves
closer to the hard filter D22 rejected.

**The arithmetic behind why the weight is small.** With `RRF_K = 60`, the entire FTS ordering
from rank 1 to rank 30 spans `1/61 - 1/90 = 0.0053`, while mere *membership* in a list is worth
`1/61 = 0.0164`. A topic bonus at full weight would outweigh the whole keyword ordering three
times over and behave as a filter. At 0.30 the bonus is `0.0049` — comparable to the keyword
spread, so it reorders near-ties without overturning a decisive match.

**Proof it is still a preference, not a filter:** *"my windows game shuts itself the moment the
loading screen appears"* routes to `proton` + `crash`, and `windows_steam` tips still come back
first, because the question says "windows" outright. The fixture calls that a miss; D22 calls
it working as designed. A test pins it (`test_topic_preference_is_not_a_filter`) so a future
weight rise cannot quietly turn the preference into a filter.

## 4. Why compat has **no** vector recall pass

It was built, measured and removed the same day.

**Structural reason.** The doors into compat retrieval are `question_targets_compat_corpus` —
True only when a **non-weak** topic matched — and the troubleshooting-log path. So reaching
this code essentially always means a topic matched, which means topic recall has already put
candidates in the pool. A vector pass could then only add *off-topic* candidates, which is the
opposite of D22. Across the 40 compat fixture rows, **zero** reach retrieval with no routed
topic.

**Measured reason.** On the tune split it cost a case and gained none: **27/27 without it,
26/27 with it**, and 4/4 on the router sentences either way.

Shipping it would have been symmetry with the strategy path for its own sake. The strategy path
needs a vector recall pass because its only other door is a keyword search over one game's
cards; the compat path has a router that already knows the subject.

## 5. Result

| | router sentences (first tip on topic) | tune top-3 |
|---|---|---|
| before | 1/4 | 22/27 (81%) |
| **after, with an embed model** | **4/4** | **27/27 (100%)** |
| **after, keyword-only Deck** | **4/4** | 26/27 (96%) |

Strategy retrieval is untouched — same cards, same order, verified against the DRG Survivor
recall case.

## 6. Not measured here

- **On-Deck.** → **KB-ROUTER-02**.
- **Which tip within a topic.** The fixture labels compat rows by `expect_topic`, and a compat
  card's `name` *is* its topic, so the eval can only tell whether a `steam_input` tip came
  back — never whether it was the *right* `steam_input` tip. That limit predates this change
  and bounds every number above.
- **The troubleshooting-log door.** No fixture row reaches retrieval that way with no routed
  topic, so the "no topic matched" path is untested. If that door ever widens, topic recall
  contributes nothing and the compat path is back to keyword-only.
