# Roadmap details: knowledge base and RAG

> The long notes for the entries in [roadmap-kb.md](roadmap-kb.md). They moved here from [roadmap-details.md](roadmap-details.md) on 2026-10-03 (plan 80). A note stays here while an entry links to it or the work is open. Closed notes go, word for word, to [the trimmed archive](archive/roadmap-trimmed-2026-10-roadmap-kb-details.md). Long notes for other parts of the roadmap stay in [roadmap-details.md](roadmap-details.md).

<!-- toc: written by scripts/docs_toc.py; do not hand-edit -->
**Contents**

- [Ordinary phrases attach game cards](#ordinary-phrases-attach-game-cards)
- [The shipping retrieval arm loses to the vector half alone on rows nobody tuned against](#the-shipping-retrieval-arm-loses-to-the-vector-half-alone-on-rows-nobody-tuned-against)
- [A troubleshooting question that only describes the symptom reaches no tips](#a-troubleshooting-question-that-only-describes-the-symptom-reaches-no-tips)
- [Unrelated questions still get game cards stapled on (2026-09-02 wording)](#unrelated-questions-still-get-game-cards-stapled-on-2026-09-02-wording)
- [User-adjustable spoiler fencing (absorbed into the tiered setting)](#user-adjustable-spoiler-fencing-absorbed-into-the-tiered-setting)
- [Spoiler coverage should be a setting with tiers](#spoiler-coverage-should-be-a-setting-with-tiers)
- [Eval fixture cannot see a recall failure](#eval-fixture-cannot-see-a-recall-failure)
- [KB visual maps](#kb-visual-maps)
- [KB online / versus strategy content, and RAG Phase 5](#kb-online--versus-strategy-content-and-rag-phase-5)
- [RAG Phase 4: extended retrieval](#rag-phase-4-extended-retrieval)
- [RAG Phase 7, Community tip contribution, RAG Phase 8](#rag-phase-7-community-tip-contribution-rag-phase-8)
- [A troubleshooting question mostly never reaches the tips](#a-troubleshooting-question-mostly-never-reaches-the-tips)
- [Wrong-subject notes](#wrong-subject-notes)
- [Hidden spoiler box stays shut on games with no Steam ID and on name-first questions](#hidden-spoiler-box-stays-shut-on-games-with-no-steam-id-and-on-name-first-questions)
- [RAG Phase 8: catalog corpus](#rag-phase-8-catalog-corpus)
- [Measure how well the AI reads a screenshot](#measure-how-well-the-ai-reads-a-screenshot)
- [Blind questions done](#blind-questions-done)
- [Speed mode tip gap](#speed-mode-tip-gap)
- [Three new games and their notes](#three-new-games-and-their-notes)
- [Black Mesa's electrified-water question](#black-mesas-electrified-water-question)
- [KB transparency matches what the model got](#kb-transparency-matches-what-the-model-got)
- [Flow L7 findings](#flow-l7-findings)
- [The note's own words under the reply](#the-notes-own-words-under-the-reply)
- [Plan 97 notes moved from the knowledge base roadmap (2026-10-22)](#plan-97-notes-moved-from-the-knowledge-base-roadmap-2026-10-22)
- [Plan 98 notes moved from the knowledge base roadmap (2026-10-24)](#plan-98-notes-moved-from-the-knowledge-base-roadmap-2026-10-24)
- [Plan 100 notes moved from the knowledge base roadmap (2026-10-25)](#plan-100-notes-moved-from-the-knowledge-base-roadmap-2026-10-25)
- [Plan 100 follow-up note moved from the knowledge-base roadmap 2026-10-26](#plan-100-follow-up-note-moved-from-the-knowledge-base-roadmap-2026-10-26)
<!-- /toc -->

## Ordinary phrases attach game cards

  - **Implemented 2026-08-23:** `VECTOR_RECALL_FLOOR` raised `py_modules/backend/knowledge/knowledge_base_service.py:148` from 0.50 to 0.515, against a fresh local repro (real `nomic-embed-text` via a local Ollama, real seed cards for the six phrases and the seven `V2-PARA-*` strategy rows in `kb_eval_v2.json` — script not committed). The two ranges overlap (noise up to 0.5308, a genuine paraphrase hit as low as 0.4302), so no single floor separates them cleanly; 0.515 was chosen to sit just above "one sentence"'s noise score (0.5034) and just below the lowest genuine score this change must not break (Mind Flayer / `V2-PARA-S04`, 0.5169).
  - **Re-measured all six phrases end-to-end** through `retrieve_knowledge_context` against the real test corpus (`build/knowledge-base-test/corpus.db`, real embeddings, real local Ollama for the query) rather than eyeballed:

    | Phrase | Before | After |
    |---|---|---|
    | "one sentence" | Praetorian | clean (genre fallback only) |
    | "please repeat that" | Glyphid Dreadnought, Nitra, Dreadnought Twins | Glyphid Dreadnought only |
    | "thank you very much" | Nitra | **unchanged — Nitra still attaches** |
    | "what time is it" | Glyphid Dreadnought, Praetorian, Classes | **unchanged — all three still attach** |
    | "our team" | clean (genre fallback only) | unchanged |
    | "four hours" | clean (genre fallback only) | unchanged |

    Matches D28's own prediction exactly: the two BM25-driven phrases are untouched (fixing them would mean touching `BM25_RELEVANCE_FLOOR`, out of scope here), "one sentence" is fully clean, and "please repeat that" is reduced but not clean. **Still OPEN, re-scoped to the two BM25-driven phrases and the residual `Glyphid Dreadnought` on "please repeat that"** — a keyword-side fix is a separate decision.

    **Maintainer call 2026-08-27:** interim, **live with the residual attachments** — the model is expected to mostly talk past an irrelevant card — but this row is now **research-first, not tune-first**: find out *why* a bare phrase clears the keyword bar for these cards before proposing any change. The backlog entry *Card relevance needs a second signal* (Knowledge base lane) is the vehicle for the eventual fix; the floors stay where they are (D28's correction note already forbids retuning `VECTOR_RECALL_FLOOR`, and `BM25_RELEVANCE_FLOOR` stays at 1.0 per D25).

    **On-Deck 2026-08-23 — all four phrases confirmed on hardware. The device reproduces the desk table exactly, card for card. D28's re-measure obligation is discharged.** Deep Rock Galactic: Survivor (`app_id 2321470`), corpus `2026.08.22`, model `gemma4:e2b-it-qat`, Strategy mode. Recordings `DeckRecord_20260823_170847`, `_172915`, `_173649`, `_173825`, `_173947`.

    | Phrase | Desk prediction | Cards actually attached on Deck |
    |---|---|---|
    | "one sentence" | clean (genre fallback only) | `Genre/compat fallback` **only** — reproduced on all three runs |
    | "please repeat that" | Glyphid Dreadnought only (was 3) | `boss: Glyphid Dreadnought` **only** |
    | "thank you very much" | unchanged — Nitra still attaches | `item: Nitra` |
    | "what time is it" | unchanged — all three still attach | `boss: Glyphid Dreadnought`, `enemy: Praetorian`, `mechanic: Classes` |

---

## The shipping retrieval arm loses to the vector half alone on rows nobody tuned against

- ★★★★ **The shipping retrieval arm loses to the vector half alone on rows nobody tuned against** — found 2026-08-29 by the first
  measurement against the 92-row blind holdout (**D37**, endorsed the same day). On `holdout`, `vector_only` scores **83.7% top-3 / 64.1%
  top-1** against the shipping `rrf` arm's **79.3% / 56.5%** — **7.6 points of top-1**. On `tune` the two were level (91.5% top-3 each,
  `rrf` marginally ahead on top-1). An arm that ties on the rows its weights were tuned on and loses by that much on rows written blind is
  the textbook shape of **fusion weights that do not generalise**, and catching it is the whole reason a blind holdout exists.
  **Filed as [D38](audit/maintainer-decisions-locked.md#d38--deferred-at-the-maintainers-request-raised-2026-08-29--what-ships-is-beaten-by-half-of-itself-on-the-blind-rows-how-should-that-be-acted-on)
  and DEFERRED 2026-08-29 at the maintainer's request** — more data, more games and more questions
  first. **No weight changes until it is answered, and never by tuning against holdout**, which would burn the only clean gate in the
  fixture. The knot worth remembering: the weights were never tuned (equal, locked 2026-08-09), and `tune` rated the blend the best arm
  available — so the one split it is legal to tune against said "change nothing" while the gate said otherwise.

**The weight sweep ran, and the change was reverted — 2026-09-06 (D82).** Leaning the search toward meaning (counting
it twice the word search) wins on both the tuning questions and the held-back ones: right note first 69.6% against
65.5% on tuning, 43.0% against 37.0% on the held-back set — a consistent direction, though every range overlaps, so
this is a direction and not a separated result. **Reverted anyway, because it breaks three rules set on purpose:** a
note whose meaning index has not been built yet gets buried behind one that has; a strong exact word match can be
pushed aside by a weaker meaning match; and one case of the locked topic-preference decision (D22) stops holding. At
equal weight a word-first and a meaning-first note tie; halve the word weight and the meaning-first note wins every
tie, everywhere — that is a design decision, not a measurement one. **The maintainer's rule for lifting it:** not
until every note is guaranteed to have its meaning index before it can be searched. The other two objections are not
covered by that rule and still need answering separately if the lean is ever taken. Weights stay even. Full write-up:
D82 in [audit/maintainer-decisions-locked.md](audit/maintainer-decisions-locked.md).

## A troubleshooting question that only describes the symptom reaches no tips

- ★★ **A troubleshooting question that only describes the symptom reaches no tips** — found 2026-08-28 by the second batch of blind
  holdout rows. The tip router reaches a question that **names** a topic (*crash*, *input*) and not one that only says what is going
  wrong. Two of the four blind tip rows miss. This is the word-boundary rule (D16) doing what it was specified to do, so it is a reach
  limit rather than a regression, and the fix is a maintainer call. Detail:
  [audit/kb-blind-holdout-rows-batch2-2026-08-28.md](../../bonsAI-workshop/archive/kb-blind-holdout-rows-batch2-2026-08-28.md) § 5.

**Built, measured, held back — 2026-09-06 (D81).** The agreed fix (let the meaning search run over the tip sheet when
no topic matched) was built and measured on four plainly-worded questions. One that used to get nothing now reaches
the controller tips — a real win. Two already worked and are unaffected. The crash question still fails, and is
arguably worse than before: it now attaches a tip about desktop mode, the wrong subject entirely, where it used to
attach nothing. **Why:** on the real tip sheet the plain word search almost always returns something, even a weak
match, so the meaning search rarely gets a turn — and even forced to run anyway, the closest tips to *"drops me back
to the library"* by meaning are about desktop mode and storage, not crashes. Matching by meaning does not connect how
a person describes a crash to how the crash tips are written; that is a fact about the tip sheet's wording, not the
code. Held, not shipped. The branch `lane/kb-symptom-search` is kept. The follow-up work — rewriting the tips to use
the words people actually type — is its own roadmap entry now. Full write-up: D81 in
[audit/maintainer-decisions-locked.md](audit/maintainer-decisions-locked.md).


**Re-measured 2026-09-07 with the tips rewritten and the routing widened, and it stays held.** The held branch does
reach further: with nothing running, all 24 of the fresh plainly-worded problem sentences get into the search, against
8 without it, and *"thank you very much"* still attaches nothing. **But what comes back is wrong.** *"game wont even
open"* and *"screen goes black when i open it"* both attach a tip about the on-screen keyboard; *"game keeps quiting to
the home screen"* attaches one about waking from sleep; *"buttons not working right half the time"* attaches one about a
PlayStation pad over Bluetooth; *"cant find my pc on the network"* attaches one about hotel Wi-Fi. **That is the same
objection that held it in the first place** — a wrong tip is worse than none.

**And the cause is now clear, which is the useful part.** The branch's meaning search is written to run *only when
nothing else finds anything*, and that almost never happens: a plain word search across 156 tips nearly always finds
something by shared words, so it wins first with a poor match and the meaning search never gets a turn. Every one of
those five came back by word search, not by meaning. **What is missing is not a wider gate — it is a way to say "none
of these tips fit."** Until there is one, opening the gate makes things worse.

**One more wrong tip, found on the device 2026-09-07 (R4):** on the routing already shipped, *"when I plug it into the
television the menus show up in the wrong spot on the screen and are hard to read"* comes back with a tip about Big
Picture Mode versus Desktop Mode, which does not answer it. Evidence
`workshop:test-evidence/plan47-R4-problems-reach-tips.json`.

## Unrelated questions still get game cards stapled on (2026-09-02 wording)

The older wording of this entry is in the trimmed archive. The tables, method and numbers are under [Ordinary phrases attach game cards](#ordinary-phrases-attach-game-cards).

## User-adjustable spoiler fencing (absorbed into the tiered setting)

Absorbed into the tiered setting: see [Spoiler coverage should be a setting with tiers](#spoiler-coverage-should-be-a-setting-with-tiers). The older entry is in the trimmed archive.

## Spoiler coverage should be a setting with tiers

- ★★★ **Spoiler coverage should be a setting with tiers** — proposed by the maintainer on the corpus gap sheet, 2026-08-29:
  *"I think spoiler coverage should be matched to a future setting. On one setting, there's no spoiling of bosses/endings/chapters. On
  the another end it'll allow anything specifically asked by the user. On another it's anything past the intro/tutorial."* Today the fencing
  rule is fixed. **Half of it already ships:** their closing line — *"if the user asks about a boss or area specifically, they don't care
  about spoilers"* — is Phase 4's locked spoiler rule (stay unfenced when the user named the thing), so the instinct matches the code. What
  is new is wanting the rest exposed as a user choice. **Default if nothing is chosen, also from the sheet: fence only named story beats and
  endings.** Needs a Settings control (and therefore a focus-graph entry), a tier the spoiler service reads, and prompt wording per tier.
  [audit/corpus-gap-answers-2026-08-29.md](../../bonsAI-workshop/archive/corpus-gap-answers-2026-08-29.md) § 5.

## Eval fixture cannot see a recall failure

- ★★ **Eval fixture cannot see a recall failure** (paraphrase rows)
  - **Goal:** `kb_eval_v2` has **1** labeled case out of 138 where keyword search returns nothing, so the slice that proves the vector half adds recall is a sample of one. Measured 2026-08-18 by the re-aligned harness. Add paraphrase rows — questions that ask for a card without using its words — until that slice can gate a regression.
  - **Largely overtaken by the blind holdout rows, pending one measurement.** The 15 paraphrase rows joined v2 as `V2-PARA-*` under **D23** (all `tune`), and 56 blind rows joined as `V2-BLIND-*` under **D37** (all `holdout`) — 20 on 2026-08-28 and 36 later the same day, 18 of the second batch written as pure paraphrases sharing no vocabulary with their card. The keyword-blind slice was **3** labeled rows when last measured on 2026-08-28, up from 1. **It has not been re-counted since the second batch**, deliberately — no measurement was run while those rows were written. Re-count it on the next arms run before deciding whether this item is closed. **Counted 2026-10-24 (plan 98 lane F, `workshop:archive/research/kb-embed-bakeoff-2026-10-24-arms.md`):** 4 labelled questions get nothing from the word search (3 tuning rows and 1 held-back row); the combined search still finds the right note in its first three for 3 of those 4 (missed: V2-PARA-S04). The 36 newer blind rows did not grow the slice (1 of 214 blind rows).

## KB visual maps

- ★★★ **KB visual maps** (strategy maps — later wave)
  - **Goal:** Optional visual strategy maps in KB-grounded replies after brief callout cards exist. **Two shapes named by the maintainer 2026-08-29:** a **dungeon map**, and a **boss outline** with the limbs and weak points marked the way Fallout marks them — so a player sees where to aim instead of reading a sentence about it.
  - **Still parked, and Terse mode does not un-park it.** Terse ships with no picture at all; its *pictures don't count against the three lines* clause is forward-looking. Nothing draws anything in a reply today — replies are `react-markdown` plus the existing fenced panels.
  - **Open:** what a boss outline is *made of* — characters the model types out, a drawing shipped with the card, or one the plugin draws from the card's own `Weak points:` line. Undecided 2026-08-29. A **dungeon map has to be authored** either way, which puts it behind the WikiTeam / archive.org source policy and a corpus rebuild — the same wall Phase 4 track 3 sits behind.
  - **Plan / depends on:** [17-kb-online-versus-strategy-content.md](planning/17-kb-online-versus-strategy-content.md) Stage 5; callout cards (OV-3.1). Phase 4 chip work remains orthogonal.

## KB online / versus strategy content, and RAG Phase 5

- ★★★★ **KB online / versus strategy content**
  - **Goal:** Online multiplayer strategy — versus, co-op, map callouts — new `section_type` values + spoiler table updates. Tier lists parked. Visual maps later wave in same plan.
  - **Plan:** [17-kb-online-versus-strategy-content.md](planning/17-kb-online-versus-strategy-content.md) (discovery locked 2026-08-09).
  - **Source policy:** WikiTeam / archive.org dumps only; hybrid attribution (short chip + snapshot in `ATTRIBUTIONS.md`).
- ★★★★ **RAG Deck query — corpus expansion (Phase 5)**
  - **Goal:** Corpus maturity after Phase 4 sample paths; session chip vector ranking.
  - **Status:** Seed deepening largely in remediation PR2; remainder depends Phase 4. [knowledge-base.md](knowledge-base.md) § Phase 5.

## RAG Phase 4: extended retrieval

- ★★★★ **RAG Deck query — extended retrieval (Phase 4)** — **tracks 1–2 shipped 2026-08-19, track 3 blocked**
  - **Goal:** Richer retrieval shapes — chip visibility, structured cards, per-game compat tips.
  - **Track 1 (shipped):** chip guarantee (≥1 corpus chip when candidates exist), game chips preferred over
    shared Deck tips, **Tip** badge on game chips only. On-Deck **PHASE4-CHIPS-01** — **badge direction passed 2026-08-29**: the **Tip** badge lands on the game chip only, never on a shared compat chip or a static seed. **The clipping direction is blocked** by the vanishing-corpus-chip bug in Bugs above, which keeps 5 of the 6 game chips off the screen, so no long label ever renders to measure.
  - **Track 2 (shipped):** 16 structured cards for the two sample titles — 6 enemy, 6 item, 4 boss —
    authored with labelled lines (`Summary:` / `Weak points:` / `Uses:` / `Phases:` / `Tips:`), plus a
    conditional prompt clause that keeps those labels as light bullets in the reply. Corpus 117 → 133
    sections.
    On-Deck **PHASE4-CARDS-01** — **not waiting on the device.** Its testing was completed 2026-08-22 (all six questions attach the right card first; the prose-only direction passes). What is left is a **maintainer call**, not a run: with `gemma4:e2b-it-qat` the bullets survive on 4 of 6 questions but the card's own labels on only 1 of 6, and whether to strengthen the prompt, route a larger model, or accept prose is the open question. Detail in [testing.md](testing.md).
  - **Track 3 (blocked):** per-game troubleshooting tips need an `app_id` column on `compat_patterns` —
    a **schema v4 bump and a corpus rebuild**, which by Decision 6 (no migration) makes every installed
    corpus stale until re-downloaded. Retrieval side is already built: it is the same recall-plus-flat-
    preference shape D22 introduced, so it reuses `preferred_ids` rather than adding a mechanism.
    Plan: [18-phase4-track3-per-game-compat-tips.md](planning/18-phase4-track3-per-game-compat-tips.md).
  - **Ship-shape lock relaxed:** Phase 4 was locked to ship all three tracks together. Two shipped without
    the third because the blocker is a release action rather than effort, and the two that shipped are the
    visible ones. **Maintainer call owed:** either accept the split or hold tracks 1–2 from the release
    notes until track 3 lands. [knowledge-base.md](knowledge-base.md) § Phase 4.

**Track 3 built 2026-09-26 (plan 70, helper E):** the schema v4 bump landed with a per-game tip
column; a game's own tip now joins the search pool ahead of an equally-good shared tip. Five tips
ship this way, two labelled "Researched, unconfirmed". Deck check owed: row **KB-TIP-PERGAME-01**,
flow R. See [Library format bump and per-game Deck tips](archive/roadmap-trimmed-2026-10-roadmap-kb-details.md#library-format-bump-and-per-game-deck-tips).

**FAILED (Deck) 2026-09-26 (plan 70, flow R):** neither game tried reached its own tip. With Deep Rock
Galactic: Survivor running, "the text on screen looks blurry on my deck" got generic display-scaling
advice with no local match at all ("No close match in my notes"); reworded as a troubleshooting-shaped
question in Speed mode it read "Knowledge base (skipped)" and logged a flat "no_hit" for the game — the
game's own Render Scale tip (already sitting in the library) was never reached either way. With Fallout
4 running, "how do I get mods working, what launch options should I use" also missed the maintainer's own
F4SE tip, attaching an unrelated Stimpaks note instead and inventing generic launch options. The cause in
both cases: the question never gets sorted as troubleshooting in the first place, and the per-game tip
pull only runs for questions that do. Fixed the same night, see the next paragraph. Evidence `workshop:test-evidence/plan70-R-R4.json`, `plan70-R-R4-try2.json` (+ two screenshots).

**Fixed 2026-09-26 (helper E2, commit `e1bc0c16`).** A game's own Deck tip now reaches the answer
whenever a game carrying its own tip is running and the question matches that tip by keyword — no
longer only when the question was already sorted as troubleshooting. Measured against 114 real
strategy-mode questions for the four games that carry a tip: 0 wrong pick-ups, 0 notes lost, and the
matching floor (4.0) sits comfortably below the weakest real question (4.91) and above the worst
strategy row that should NOT match (3.34). Works in Speed mode and when Strategy mode had locked the
question to strategy notes instead.

**Passed on the Deck 2026-09-26 (plan 70, flow L7), closed:** every step of that re-check passed —
Fallout 4 with the game named rather than running, since the question box was dead over the running
game. The library was published by the maintainer on 2026-09-27. Full readings in
[Flow L7 findings](#flow-l7-findings). Evidence `workshop:test-evidence/plan70-R4-try3.json`,
`plan70-R4-try4.json`, `plan70-R4-try6.json`.

Moved here from the roadmap entry on 2026-10-02 (docs sweep, plan 79), to keep the roadmap under its size limit. Nothing was removed.

  The chip labels fit on 2026-09-26. **2026-09-30 (plan 78 helper F, `092517c1`, `5e3e0f7e`):** the promise that one of the game's own chips always shows failed on the Deck 2026-09-26 (`workshop:test-evidence/plan70-L6-PHASE4-CHIPS-01.json`). Cause: three of the four chip styles dealt the game's chips only once, and with one chip showing the promised chip sat in a spot that is off screen. Fixed, and the chip promise passed on the Deck 2026-10-01 (rows P78-TIP-CHIP and P78-CHIP-PACE; evidence `workshop:test-evidence/plan78-P78-TIP-CHIP-try2.json`); the maintainer's own look at the pace is still owed, under the Verify entry "The game's own chip never came back, and the chips turned over too slowly".

## RAG Phase 7, Community tip contribution, RAG Phase 8

- ★★★★ **RAG Deck query — retrieval infra (Phase 7)**
  - **Goal:** Optional sqlite-vss/ANN, auto-pull nomic, RRF extensions, vision→KB, demote, packs, intent retrieval.
  - **Status:** FTS+vector shipped in remediation; the locked **meaning-fallback** track (vector list into RRF when FTS is empty/weak) shipped 2026-08-18 as the per-game recall pass — sqlite-vss/ANN is now an optimisation of a path that exists, not a prerequisite. Remainder docs only. [knowledge-base.md](knowledge-base.md) § Phase 7.
- ★★★★★ **Community tip contribution** (corpus inbound path)
  - **GitHub:** [bonsAI Issues](https://github.com/qd313/bonsAI/issues) — issue TBD.
  - **Goal:** Reply → **Suggest as a tip** writes schema-valid card to Desktop + GitHub attach URL.
  - **Depends on:** **RAG Phase 6** public publish — **shipped 2026-08-16, so this is unblocked** ([archive/roadmap-completed.md](archive/roadmap-completed.md)).
  - **Source:** [13-roadmap-feature-ideas.md](../../bonsAI-workshop/archive/13-roadmap-feature-ideas.md) § C2.
- ★★★★★★ **RAG Deck query — catalog corpus (Phase 8)**
  - **GitHub:** [bonsAI Issues](https://github.com/qd313/bonsAI/issues) — issue TBD.
  - **Goal:** Large offline catalog after Phase 6 publish (~top 1000 Steam, ~100 Deck, emulated slice).
  - **Status:** Locked intent only. [knowledge-base.md](knowledge-base.md) § Phase 8.
  - **Depends on:** Phase 6 (shipped 2026-08-16) + likely Phase 7 infra.

**The thumbs-down piece drawn 2026-09-26 (plan 70, helper T):** three options at the Deck's true
size — [drawn true size](https://claude.ai/artifact/K2MXtVYoEYV6cNxsAzUh43) — the helper recommends
option C. Not built (D112 #8); the maintainer picks.

## A troubleshooting question mostly never reaches the tips

- ★★★ `[KB]` **A troubleshooting question mostly never reaches the tips** — **OPEN, widened 2026-09-07.** Filed as
  "the tips don't use the words people type", which is true and is the smaller half. Measured 2026-09-07: **nine of ten
  ordinary problem sentences reach nothing at all** — *"my game keeps crashing"*, *"my game won't launch"*, *"black
  screen when I start the game"*. The word "crash" is deliberately classed as too weak to route a question on its own;
that holds with a game running and not with nothing running. The tip cut-off and a false word match were fixed
2026-09-26, and the "no tip for this" line was retired 2026-09-27 (`db4b3b4a`). Remeasured 2026-10-24 (plan 98 lane F): 8 of 24 plain sentences reach a tip (6 right, 1 half, 1 wrong); the held meaning-search branch reaches all 24 but only 13 are right, 3 half and 8 wrong. (D81, D85) Planned as wave three ([48](../../bonsAI-workshop/archive/48-kb-wave-three-session.md)).

**Related work landed 2026-09-26 (plan 70, helper C):** the tip cut-off and a false-positive word
match are now fixed (see [Tip cut-off fix](archive/roadmap-trimmed-2026-10-roadmap-kb-details.md#tip-cut-off-fix), [Lan word-boundary fix](archive/roadmap-trimmed-2026-10-roadmap-kb-details.md#lan-word-boundary-fix)).
The "no tip for this" line was retired by the maintainer 2026-09-27 (`db4b3b4a`), since it could never appear. The numbers behind that call are in [No tip line numbers](archive/roadmap-trimmed-2026-10-roadmap-kb-details.md#no-tip-line-numbers).

## Wrong-subject notes

**The Black Mesa horse-taming case is fixed:** since `2abaa0ae` it shows the "No close match" line, passed on the Deck 2026-10-03 (`workshop:test-evidence/plan81-P81-KB-NOTES-FIRST.json`). **Two cases are not fixed and were not tried again on 2026-10-03:** a Portal 2 house-buying question and a Hades boss that does not exist. Asking about something the notes do not cover can still attach a note about the wrong subject. Fixing the attachment itself, rather than labelling it, is wave-four note-writing work.

**Found again 2026-09-18:** a Hades "boss at the end of the first area" question
  attached "Temple of Styx" first and the reply answered about Theseus and Asterius instead of Megaera, steered
  by the top note (`workshop:test-evidence/plan58p1-QA-NOTES-BLOCK-02.json`).

  **Sighting, 2026-09-26 (plan 70, flow L1):** Hades "who is the first boss" and "the boss at the end of
  Tartarus" both attached the same wrong note (Theseus and Asterius) and the reply talked about them,
  twice. Evidence `workshop:test-evidence/plan70-SPOILER-COVER-01.json`.

**Checked 2026-09-26 (plan 70, flow L2): borderline, known fragile, not a regression.** After the "no
close match" wiring fix landed (`e4c24bdd`), the Black Mesa horse-taming control question — still a
wrong-subject question with nothing that matches — no longer showed the "no close match" line at all, on
screen or in the saved chat file. The model instead said in its own words that it had no information on
the subject, inside its own spoiler cover around otherwise harmless general mechanics. Evidence
`workshop:test-evidence/plan70-NO-CLOSE-MATCH-HK-02.json`.

**Measured the same day with the real code and the current library, on the PC.** Once the game's own
name is removed from the question, none of "tame" or "horse" appears in any of the three attached notes
— the note-text fix changes nothing here either way. The line is decided by the older score that judges
closeness without the game's name, and that score landed at 0.6508 against the 0.65 cut-off: on the
edge, close enough that ordinary differences between the PC's and the Deck's own embedding numbers can
flip it. A measured cut-off is not retuned for one question; no code change made.

**Fixed for this case 2026-10-03 (plan 81, `2abaa0ae`), the cut-off untouched:** the "No close match" line now also shows when the word search ranked none of the attached notes and not one word of the question appears in any attached note's title or text, so the meaning score alone supported them. On this PC over 287 test questions with a recorded right note, each asked with the game running and with its name typed (574 asks), the rule changes the line on none of them; the one ask it changes is the horse question. Passed on the Deck 2026-10-03 (plan 81, build `9e68bce1`, row P81-KB-NOTES-FIRST): the horse question showed the line and listed no note. Evidence `workshop:test-evidence/plan81-P81-KB-NOTES-FIRST.json`.

**Moved from the roadmap 2026-10-24 (plan 98 docs sweep 2), word for word:**

  **2026-10-14 (plan 93 Deck block D3, Deep Rock Galactic: Survivor running, Strategy mode):** "How do I buy a house in this game" attached 3 notes (Gold, Nitra, Mining and the run timer) and drew a "From the notes" block (Gold), with no "No close match" line; the AI read "buy" as the in-game Gold shop. Evidence `workshop:test-evidence/plan93-NOTES-BLOCK-04-game-strategy-D3.json`.
  **Plan 97 (call 8, [D134](audit/maintainer-decisions-locked.md#d134--locked-2026-10-22-raised-2026-10-22--plan-97-the-bug-list-and-the-verify-list-toward-zero-the-second-sweep-the-ten-calls)):** stays out of plan 97.

**Moved from the roadmap 2026-10-24 (plan 98 docs sweep 3), word for word. The wrong-subject entry, before its fix landed:**

- ★★ `[KB]` **Questions with no real answer in the notes can still get notes about the wrong subject (Portal 2 house buying, a Hades boss that does not exist)** — **OPEN, found 2026-09-07, seen again 2026-09-26, 2026-10-14 and 2026-10-24; fix being built (plan 98 lanes L and D).**
  The Black Mesa horse question is fixed: it shows the "No close match" line since `2abaa0ae` (passed on the Deck 2026-10-03, `workshop:test-evidence/plan81-P81-KB-NOTES-FIRST.json`). A Portal 2 house-buying question and a Hades boss that does not exist can still bring up notes about something else, and the reply follows them. Catching these in general still costs twenty or more right answers elsewhere.
  **Deck 2026-10-24 (plan 98 block K0, release build `f0b72dae7b65`, the Deck's own screen and AI), MEASURED:** "How do I buy a house in this game" (Deep Rock Galactic: Survivor running) attached Gold, Nitra and Mining and the run timer, and drew no notes block and no "No close match" line. "In Hades, how do I beat the boss called the Bone Hydra" (nothing running) attached Heat and the Pact of Punishment, Theseus and Asterius, and Weapon choice; the whole answer sat behind a closed spoiler box, and the warning line, though it is in the saved reply, did not show. Evidence `workshop:test-evidence/plan98-P98-NOTES-BLOCK-04-READING-3.json`, `workshop:test-evidence/plan98-P98-NOTES-BLOCK-04-READING-4.json`.
  **Two causes (second opinion, plan 98 consult 1, 2026-10-24):** (1) The line trusts any shared word when a game is running: "buy" in the house question matched "Buys" in the Gold and Nitra notes, which switched the warning off. The fix being built shows the line whenever none of the question's own subject words appears in any attached note. (2) The screen deletes the line when the answer's words echo a note, which is what hid it on the Bone Hydra answer. The fix being built removes that deletion.
  Older notes (2026-10-14 and the plan 97 call), word for word: [Detail](roadmap-kb-details.md#wrong-subject-notes)

**The "made-up subject" entry (row NOTES-BLOCK-04, the line half), before its fix landed:**

- ★★ `[KB]` **With a made-up subject, the "No close match" line can be skipped when weak notes are attached (row NOTES-BLOCK-04, the line half)** — **OPEN, failed on the Deck 2026-10-22 (plan 97 block B, build `73738058`); both questions passed on 2026-10-24, so it varies between runs.**
  Deep Rock Galactic: Survivor running, Strategy mode, the Deck's own AI. "Who is the final boss called Zorblax in this game": the line showed and no notes block was drawn (pass). "How do I defeat the boss named Grimthak in this game": no line, and a "Glyphid Dreadnought" notes block was drawn, because the back end attached two weak notes (Glyphid Dreadnought, Dreadnought Twins) and judged them close enough to skip the line; the first question had three weak notes attached and got the line.
  It depends on what retrieval attaches, not on what the AI wrote; neither boss has a note. Same family as the wrong-subject entry above. Evidence `workshop:test-evidence/plan97-NOTES-BLOCK-04.json`. Row **NOTES-BLOCK-04** stays owed in [testing-manual.md](testing-manual.md).
  **Deck 2026-10-24 (plan 98 block K0, release build `f0b72dae7b65`, Deep Rock Galactic: Survivor running, Strategy mode), MEASURED:** both questions drew the "No close match" line and no notes block. "Zorblax" had three weak notes attached (Glyphid Dreadnought, Dreadnought Twins, Exploder); "Grimthak" had Glyphid Dreadnought, Dreadnought Twins and Mactera, and did not repeat 2026-10-22 (block drawn, no line). Evidence `workshop:test-evidence/plan98-P98-NOTES-BLOCK-04-READING-1.json`, `workshop:test-evidence/plan98-P98-NOTES-BLOCK-04-READING-2.json`.

## Hidden spoiler box stays shut on games with no Steam ID and on name-first questions

- ★★ `[KB]` **Hidden spoiler box stays shut on games with no Steam ID and on name-first questions** — **VERIFY,
  landed 2026-09-15, four commits, unit-tested.** A game known only by name now opens its box; naming the boss
  first opens it on screen, in copied text and in read-aloud; a no-story game named in the question gets the same
  relaxed prompt its risk chip already assumed. **STRAT-SPOIL-TEXT-01 passed on the Deck 2026-09-15, both halves.**
  **STRAT-SPOIL-FIRST-01 passed on the Deck 2026-09-18:** naming Wheatley up front in Portal 2 kept the whole
  answer in plain text from the first streamed word, with no hidden box, and it was still plain after closing
  and reopening the chat; the old "Portal 2 not in the library" note is settled — it was installed all along.
  Evidence `workshop:test-evidence/plan61-STRAT-SPOIL-FIRST-01.json`.
  **STRAT-SPOIL-NAME-01 is still blocked.** It could not run four times, the last on 2026-10-02: none of Doom 64, Doom 64:
  Retribution, Super Mario 64, Mario Kart 64 or Pikmin 2 is on the Deck's Recent Games row, the only list the launch tool can search,
  so one of them has to be played once by hand first. It is proven by its unit tests only. Evidence
  `workshop:test-evidence/plan79-STRAT-SPOIL-NAME-01.json`. **DRG-01c** was not tried on purpose (it would mean removing the library). **Tried 2026-10-03 (plan 81, build `afd2f444`): could not run** — Steam's
  screen froze after the answer (filed under Bugs); evidence `workshop:test-evidence/plan81-DRG-01c.json`. **Second try, 2026-10-03, PASSED** (after a restart of the Deck, library moved aside, Deep Rock Galactic: Survivor running): a Glyphid Dreadnought question came out as plain text with no cover and no chip at any of 368 reads, the log reading "unavailable=corpus_missing"; the AI wrote no hidden block, so a cover was not tested directly. Evidence `workshop:test-evidence/plan81-DRG-01c-try2.json`.
  [Plan 54](../../bonsAI-workshop/archive/54-spoiler-rules-gaps.md).

**DRG-01b passed on the Deck 2026-09-23:** with Deep Rock Galactic: Survivor running, the knowledge
base off, masking on and no consent phrase, the boss tactics came back in plain text — no cover, no
notes block, no knowledge-base search in the log, and no question-box trap on the way to Ask.
Evidence `workshop:test-evidence/plan64-DRG-01b.json`. STRAT-SPOIL-NAME-01 is still blocked, since Doom 64
cannot be launched.

## RAG Phase 8: catalog corpus

- ★★★★★★ `[KB]` **RAG Phase 8: catalog corpus** — **OPEN, intent only.** The change that makes most people's games get
  notes instead of the model's memory: about the top 1000 Steam titles, the top 100 on Deck, and an emulated slice. Months:
  it cannot be hand-written (161 cards took six weeks), so it needs an ingestion pipeline from wiki dumps, per-source
  licensing, a size budget, packs and the index. [knowledge-base.md](knowledge-base.md) § Phase 8. The first step is
  planned as [58 phase 1](../../bonsAI-workshop/archive/58-phase-1-notes-shown-and-wiki-extracts.md): a reader that takes a wiki's own
  sentences without rewriting them, ten games from sources already cleared, and a study of which sources cover many
  games under one licence. That [source study](../../bonsAI-workshop/archive/research/kb-catalog-sources-2026-09.md) landed 2026-09-17
  and recommends the Super Mario Wiki first, the per-wiki Fandom check second, and the walkthrough wiki third
  once its saved copy has been tried with the reader. The first ten games from those cleared sources landed
  2026-09-18, written from the wiki pages fetched that day, taking the library to 35 games; landing them
  reopened the July no-new-games lock, since the catalog phase starts here (D111).

*Moved out of the roadmap on 2026-09-21, superseded by the current summary there.*

## Measure how well the AI reads a screenshot

**Added 2026-09-25 by the maintainer: "an ignored part of the app".** Attaching a screenshot is a headline
feature, and nothing measures it. Every answer and search number in this project comes from typed questions.

**What is true today, read from the code.** A screenshot goes to a picture-capable model with the question.
The prompt asks it to look at the game world rather than the Steam overlay, and to say what it is looking at.
Steam's own screenshot file sometimes adds a game name. The note search never sees the picture: it runs on
the typed words and the running game only. So a screenshot of a boss, with *"how do I beat this?"*, searches
the notes for "how do I beat this" — the right boss note can only be found by luck. The plan to feed the
picture's guess into the search (*vision to entity*) was sketched in knowledge-base.md § Phase 7 and never
built or measured.

**Step 1 — a scored screenshot set (the measurement).**
- 40–60 real screenshots from the Deck, across games that have notes and a few that do not. Each labelled
  by hand with three answers: the game, the area or dungeon, and the boss or enemy if one is on screen.
- Mix of easy and hard: title screens and menus, plain play, a boss fight, a dark cave, a loading screen, a
  game with no notes at all. Some taken with the game running and its name known, some with it unknown
  (as if the picture were attached later).
- A scoring script that asks each question, reads the reply, and marks three things: right game, right area,
  right boss — plus "said it did not know" as its own, better-than-wrong result.
- Run it on every picture model the Deck offers, and record time to first word, because a picture is slow.
- Report three plain figures per model: out of a hundred screenshots, how often it named the game, the
  area, the boss.

**Step 2 — improvements, each measured against step 1.**
- **Feed the picture's guess into the note search.** Ask the model first what game, place and enemy it sees,
  then search the notes with that as well as the typed words. The earlier sketch wanted no extra call;
  measure whether one short extra call is worth its time.
- **Notes that say what things look like.** A boss note today says how to beat it, not what it looks like.
  A one-line "looks like" field on boss, area and enemy notes (colours, shape, a landmark) gives the
  search something to match the picture's description against. Rides a library release.
- **A screen guide note per game.** One note describing the game's on-screen display in words: where
  health, stamina and ammo sit and what they look like, the weapon or item slots, the minimap, and where
  a boss's name and health bar appear. It is the strongest clue to which game a picture is from, it lets
  the reply read the player's state (low health, weapon equipped, boss fight on), and it answers "what
  does this icon mean?", which gets nothing today. Written in words, not stored pictures: the Deck's model
  describes a picture in words and the notes are searched in words, so it fits what exists, with no
  image rights question and no bigger download. Needs a new note kind and rides a library release.
  Screenshots of each game's display go only in the step 1 test set, never shipped, to prove the notes
  help; if they do not, that is the case for the picture matching below.
- **Use the running game's name as a strong hint.** When a game is running the game is already known; the
  picture only has to find the place and the boss, a much easier task. Measure both cases separately.
- **Later, if the above stalls:** match the picture itself against reference pictures per note, with a
  picture-matching model. Bigger, needs pictures in the library and a size budget.

**Connected:** the big-screenshot crash (plan 70 shrinks them first — this set should use the shrunk size),
the Phase 7 entry's "a screenshot feeding the search", and the visual-maps idea.

## Blind questions done

**Landed 2026-09-26 (commit `2a47880e`).** 20 of the games with real notes had never had a real player
question written against them to check search with, and the three games due to get notes this wave
(Brotato, Palworld, Skyrim) plus new "where do I start" asks for six games had none either. Adds 107
rows to the search-testing file, written without reading any note or card so the questions cannot
accidentally copy a note's own wording: 80 rows across 20 games that had none (of 23 the session
listed; Donkey Kong 64, Diddy Kong Racing and Yoshi's Story already had rows from an earlier wave and
were skipped), 18 rows for the three new games, and 9 "where do I start" rows for six games. 72 are
scored questions, 35 are for tuning. They change no score until labelled — the search test leaves
unlabelled rows out. Every game in the library now has blind test questions.

## Speed mode tip gap

**Found 2026-09-26 (plan 70, helper C), not fixed this wave.** Speed is the default mode, and only plain
word matching runs there for a troubleshooting tip — the meaning check that would catch a stray word
match never gets a turn. Dormant today because the junk phrases already found never reach the tip sheet
at all, but a question that does reach it in Speed mode has nothing stopping a wrong tip from a stray
word match.

## Three new games and their notes

**Landed 2026-09-26 (plan 70, helpers F and G).** Brotato (12 notes: starting a run, the shop and reroll
pricing, materials/gold/experience, danger levels, elite and horde waves, characters and item tags, the
two wave-20 bosses, tougher elite enemies, early common enemies, item rarity, the guaranteed legendary
drop) and Palworld (12 notes: starting a run, catching Pals, building and running a base, keeping Pals
fit to work, breeding, technology points, the five kinds of boss fight, Tower fights against Faction
Leaders, roaming Alpha world bosses, the starting Pal Sphere, weapons and ammo), both reworded in
bonsAI's own words from their wikis (CC BY-SA 4.0). Skyrim Special Edition (15 notes, from the
Unofficial Elder Scrolls Pages, share-alike 2.5, every sentence checked against its page) plus
starting-out notes for Cyberpunk 2077, Fallout 4 and Red Dead Redemption 2 (bonsAI's own words; its
wiki is not usable). Spoiler profiles: Brotato has no story to protect, so its boxes open right away,
like Deep Rock Galactic and DOOM Eternal; Palworld's Tower fights against named Faction Leaders gate
real story progress, so it keeps a box closed until tapped, like Hades; Skyrim also protects story
progress. **A line-by-line check of every sentence against its source page, done after the fact, found
invented details in most of the new notes** — see the lesson in docs/lessons-learned.md. Fixed before
landing: 8 sentences in the Brotato/Palworld notes (`cc48166d`), and claims in 14 of Skyrim's 18 notes.
The two helpers' note lists collided on landing (both had appended to the same lists) and were merged
by content, not by discarding either. The library is now 38 games, 414 notes.

## Black Mesa's electrified-water question

**Found 2026-09-19.** Asking how to cross the electrified water gave the right, specific answer, but
the two notes Show details named as used were general early-game notes about starting out and the
opening tram ride — neither one is the electrified-water note, which does exist in the library. Evidence `workshop:test-evidence/plan61-W3-D-blackmesa.json`.
**Asked again 2026-09-23 with the exact original
words, better but not fixed:** the electrified-water note is now attached and the answer is built on it,
but the two generic notes are still attached too, still listed first, and the block header still names
"Starting out in Black Mesa" — the same ranking shape as the Hollow Knight "no close match" bug, where
the right note is found but ranks behind generic ones. Evidence
`workshop:test-evidence/plan64-BLACKMESA-WATER.json`. **Asked again 2026-09-23 with Black Mesa running: no
change** — having the game running did not affect this bug either way. Evidence
`workshop:test-evidence/plan64-BLACKMESA-WATER-running.json`.

**Measured 2026-09-26 (plan 70, helper B): ranking a "Starting out" note lower is not this wave's
fix.** It helped the search test but hurt the answer test (46 to 41 of 57 right note first), so it
stays off; it would not have cured this bug alone either, since a second generic note still ranks
ahead.

**Fixed 2026-10-03 (plan 81, `619842fd`), a different way, with nothing ranked lower:** the word search now leaves the game's name (and its aliases) out of the words it looks for, because it is already limited to the one game and the name only favoured notes with it in their title. Asking "black mesa how do i get across the electrified water" with nothing running now lists the water note first. A question that asks how to start keeps the name. Measured on this PC over the fixture questions, each asked with the game's name typed: the right note first went from 108 to 159 of 287, the right note in the first three from 201 to 209, none lost. On the held-back split the shipped search's first place went from 68.6 to 74.2 percent and its first three from 87.7 to 88.1; the tuning split is unchanged.

**The answer test over the 13 questions whose notes changed (plan 81):** facts kept went from 102 to 105 of 195, so there is no drop overall. Two GTA V questions are lower, 22 to 8 of 30, because the facts the test expects sit in the generic note and its wording check misses a correct paraphrase of the new note; the other 11 questions are higher, 80 to 97 of 165. (The commit message for `619842fd` gives an earlier run of the same test, 70 to 61 of 117 facts kept on the 13 questions; the two runs differ in size.) Passed on the Deck 2026-10-03 (plan 81, build `9e68bce1`, row P81-KB-NOTES-FIRST): the water question listed only its water note, so it came first. Evidence `workshop:test-evidence/plan81-P81-KB-NOTES-FIRST.json`.

## KB transparency matches what the model got

Passed on the Deck 2026-09-22 and 2026-09-23. Evidence `workshop:test-evidence/plan64-KB-TRANSPARENCY-names.json`. The full readings are in the trimmed archive.

**Sighting, 2026-09-23:** searching the notes by meaning took about 1,070 milliseconds with a game
running, against 22 to 60 milliseconds measured elsewhere with nothing running.

## Flow L7 findings

Open items from plan 70's last Deck block, flow L7 (2026-09-26, 21:52 to 23:43). The closed fixes from that block are in the trimmed archive.

**New, open: a chat opened with RB while a game runs is drawn as history, and Down dies on its question
line.** With Deep Rock Galactic: Survivor running, RB from an empty new chat to the answered Dreadnought
chat drew it without its Helpful row, "Save chat" row or chip; Down reached the question line and then
did nothing for six presses while the page's own focus moved to "Show reasoning". Closing and reopening
the panel drew the chat in full and cleared it. Evidence `workshop:test-evidence/plan70-HIDDEN-RING-recheck.json`,
`plan70-HIDDEN-RING-recheck-stuck-question-row.png`.
**New, open: a game's own tip is found only by its own words.** "The words on screen look blurry" in Deep
Rock Galactic: Survivor attached no tip — its keyword score was 2.0 against the 4.0 cut-off — while "the
text ... looks blurry" scores 6.9 and finds it. A question that avoids the tip's own words misses it; a
rescue by meaning search was measured and left for a later lane. Evidence `workshop:test-evidence/plan70-R4-try5.json`.
**Fixed 2026-10-03 (plan 81, `e78f0d6e`, `6f758ff0`), passed on the Deck 2026-10-03 (build `9e68bce1`, row P81-TIP-BY-MEANING; `workshop:test-evidence/plan81-P81-TIP-BY-MEANING.json`).** In Strategy and Expert mode a game's
tip is now also found by meaning: "the words on screen look blurry" attaches Render Scale. The boss question is unchanged, and Speed
mode is unchanged on purpose. Held-back measurements are identical before and after: no right answer lost, no new wrong one.
Limits: the long Deck sentence that also names the game ("deep rock galactic survivor the words on screen look blurry on my deck,
what should i change") still misses; one made-up phrase, "how do i launch a mission", now attaches Fallout 4's launch-option tip.
Test `tests/test_kb_game_tip_meaning.py`.

**New sightings, open:** after a bare follow-up the suggestion chip read "Enable local knowledge base for
better game tips" though the knowledge base was on (once); the plugin log warned twice that a Strategy
answer's follow-up choices were not understood, so no choice menu showed (both on troubleshooting turns).
Evidence `workshop:test-evidence/plan70-R4-try5.json`. And an answer that used the Render Scale tip said text
blurs when Render Scale is "too high", then said to raise it — the tip says plainly to raise it; the small
model garbled a clear tip (logged under "Deeper answer checks"). Evidence `workshop:test-evidence/plan70-R4-try6.json`.

## The note's own words under the reply

Older notes, word for word (moved here 2026-10-14, plan 93 docs sweep).

  rows passed on the Deck and are closed: 01, 02, 03, 05, 06 and TEN-GAMES-01; 04's "no block" half passed 2026-10-03
  (`workshop:test-evidence/plan81-NOTES-BLOCK-04.json`). **Still owed:** 04's covered-game-running half (2026-10-03: the Black Mesa horse question showed the "No close match" line with no notes listed, `workshop:test-evidence/plan81-P81-KB-NOTES-FIRST.json`, but with no game running; 2026-10-08, game running: UNCLEAR, both tries attached notes (1042 and 1242 characters), so a reply with nothing attached never came up, `workshop:test-evidence/plan83-NOTES-BLOCK-04-game.json`), NOTES-BLOCK-07 (needs a person
  listening to confirm the block is never read aloud) and NOTES-BLOCK-LADDER (no block has had a chip ladder to test;
  retiring that half is the maintainer's call). Rows in [testing-manual.md](testing-manual.md). **2026-10-10 (plan 87 K1):** a fix for the "No close match" line appearing beside a notes block landed; 04's covered-game-running half and new row P87-K1-LINE-AND-BLOCK stay owed on the Deck. **2026-10-10 (plan 87 Deck blocks 5 and 5b):** row P87-K1-LINE-AND-BLOCK passed for 2 of its 3 asks (the notes block with no "No close match" line; `workshop:test-evidence/plan87-P87-K1-LINE-AND-BLOCK.json`, `plan87-P87-K1-LINE-AND-BLOCK-try2.json`); NOTES-BLOCK-04's own covered-game-running half is not marked closed by that result and stays owed.

**Moved from the roadmap 2026-10-22 (plan 97 docs sweep 3), word for word:**

  **2026-10-14 (plan 93 Deck block D3, Strategy mode, game running, two questions):** the line half is UNCLEAR. A made-up boss ("Who is the final boss called Zorblax") showed the "No close match" line and no notes block: PASS. "How do I buy a house in this game" drew a "From the notes" block and no line: FAIL, the known wrong-subject-notes entry above. Evidence `workshop:test-evidence/plan93-NOTES-BLOCK-04-game-strategy-D3.json`.
  **2026-10-14 (plan 93 Deck block C part 2, Deep Rock Galactic: Survivor running, Speed mode, two questions):** no notes block under either answer (the block half passes). The "Not in my notes" line did not show under either; the back end logged "no footer line added". That line shows only in Strategy and Expert by design (`py_modules/backend/knowledge/kb_not_in_notes_notice.py`), so the line half is still owed in Strategy or Expert. The evidence file marks the line half FAIL and only names Speed as a possible cause. Evidence `workshop:test-evidence/plan93-NOTES-BLOCK-04-game.json`.


## Plan 97 notes moved from the knowledge base roadmap (2026-10-22)

**The knowledge library update treats any different version as newer (older entry, word for word):**

- ★★ `[KB]` **The knowledge library update treats any different version as newer, and installs onto the Deck's own drive without asking where** — **OPEN, found 2026-10-16 (plan 86 step 3 Deck block).**
  It offered 2026.09.26 as an update over the seed's 2026.10.16. The library had been on the SD card; the update put the same files, byte for byte, on the Deck's own drive. The maintainer said to leave it there tonight. Evidence `workshop:test-evidence/plan86-B6-RESTORE.json`.
  **2026-10-17 (plan 94 block 3, Deck, build `e9b50cc8`):** the first download now asks where to put the library (Not now / Internal storage / SD card) before the download box. The "different version offered as newer" half was not tested (a fresh install has no older version). Evidence `workshop:test-evidence/plan94-P94-KB-DOWNLOAD.json`.

## Plan 98 notes moved from the knowledge base roadmap (2026-10-24)

Moved word for word by the plan 98 docs sweep 3 to keep the roadmap under its size limit.

**The knowledge library update: Deck readings 2026-10-22 and 2026-10-24:**

**Deck 2026-10-22 (plan 97 block D4, build `15565346`): PASS for the first half, UNCLEAR for the wording.** Nothing downloaded (file dates unchanged), the status stayed "Installed" and the plugin log named both versions (installed 2026.10.17, newest 2026.10.17). The "newer than published" line could not appear: the maintainer has published the library since, so it now equals the installed one and the line read "Already up to date (version 2026.10.17)." That wording needs a published library older than the Deck's (`workshop:test-evidence/plan97-P97-L9-KB-UPDATE.json`). Row **P97-L9-KB-UPDATE** stays open for it. **2026-10-24 (plan 98 block K0): could not run** again: the clean install left no test library on the Deck, and the installed and published libraries are both 2026.10.17. It runs after the first deploy of plan 98's night (`workshop:test-evidence/plan98-P97-L9-KB-UPDATE.json`). Evidence of the failure `workshop:test-evidence/plan86-B6-RESTORE.json`. Older notes: [roadmap-kb-details.md](roadmap-kb-details.md#plan-97-notes-moved-from-the-knowledge-base-roadmap-2026-10-22).

**The note's own words: plan 97 block B reading:**

**2026-10-22 (plan 97 block B, build `73738058`, Deep Rock Galactic: Survivor running, Strategy mode):** NOTES-BLOCK-04's line half FAILED on the second of two questions (the first passed): see the new Bugs entry. NOTES-BLOCK-LADDER was UNCLEAR again (retired by the maintainer's call afterwards, see above): a "Soul Master" block ("From the Hollow Knight wiki") opens to one paragraph with no chip ladder, and Left and Right do nothing (`workshop:test-evidence/plan97-NOTES-BLOCK-LADDER.json`). The two 2026-10-14 notes, word for word: [roadmap-kb-details.md](roadmap-kb-details.md#the-notes-own-words-under-the-reply).

**Unrelated questions: the 2026-10-24 reading:**

**Deck 2026-10-24 (plan 98 block K0, release build `f0b72dae7b65`, Deep Rock Galactic: Survivor running, Strategy mode), MEASURED:** "thank you very much" attached no notes (the AI answered the earlier question again, as a follow-up, and the "Not in my notes" line showed). "what time is it" attached Gold, Red Sugar and Nitra, drew no block and no line, and the AI said it has no clock. The second phrase still pulls notes. The reading is muddied, because short questions with "it" are treated as follow-ups to the previous question (see the new entry at the top of this list); a clean re-run in a fresh chat is owed. Evidence `workshop:test-evidence/plan98-P98-JUNK-PHRASES.json`.

**The plainly-worded Deck problems: the second opinion's word list:**

**Second opinion 2026-10-24 (plan 98 consult 2): fix the wording in two places, not a cut-off.** Five tips need more of the plain words people use: the crash tip ("a crash drops you back to the game library": add "home screen", "closes on its own", "quits", "shuts off"); the storage-full tip ("not enough space", "no space left", "can't install"); the crashes-at-launch tip ("won't open", "won't start", "nothing happens when I launch"); the blank-screen display tip ("black screen", "goes black", and the built-in screen too); the find-the-PC tips ("can't find my PC", "my computer is not in the list", "same network"). The router's topic words need the same plain words. Two problems have no tip at all: sound going to the TV instead of plugged-in headphones, and menus out of place on a TV. The 24 test sentences have no recorded right tip, so expected tips must be written into the test fixture before any gate.

**STRAT-SPOIL-NAME-01: why it could not run:**

**Still owed:** STRAT-SPOIL-NAME-01 could not run five times, last 2026-10-24 (plan 98 block K0): Doom 64: Retribution, Pikmin 2 and Super Mario 64 are on the Recent Games row now, but they are non-Steam shortcuts and the rig's launch tool cannot recognise their tiles (logged in [mcp-setup.md](mcp-setup.md)). A hand launch by the maintainer, left running, would let the rig run the rest; it is on the checks page. Evidence `workshop:test-evidence/plan98-STRAT-SPOIL-NAME-01.json`.

**A card named after a category: the 2026-10-24 measurement:**

**Measured 2026-10-24 (plan 98 lane F, `workshop:archive/research/kb-embed-bakeoff-2026-10-24-arms.md`):** on 279 strategy questions with a recorded right note, a category note came first in 3 (about 1 in 100). Only one of them (V2-S-RDR2-06, "how to get a better horse early": Horse breeds first, Horse bonding second) fits this entry; the other two name the category themselves. D41 stays your call, with this figure for it.

**Troubleshooting symptom entry: the second half of its text:**

fit" floor now exists, and the held fix was re-measured with it on 2026-10-24 (plan 98 lane F, `workshop:archive/research/kb-embed-bakeoff-2026-10-24-arms.md`): today 8 of 24 plain problem sentences reach a tip (6 right, 1 half, 1 wrong). With the held meaning-search branch (hand-ported, it no longer applies to today's files) all 24 reach a tip, but only 13 are right, 3 half and 8 wrong. So it stays held: it would trade "no tip" for a wrong tip on a third of the questions. Overlaps the entry of the same subject in

**The eval cannot yet prove the meaning search rescues many questions:**

- ★★ `[KB]` **The eval cannot yet prove the meaning search rescues many questions** — **OPEN, counted 2026-10-24 (plan 98 lane F, `workshop:archive/research/kb-embed-bakeoff-2026-10-24-arms.md`).** Of the labelled questions, 4 (3 tuning rows and 1 held-back row) get nothing from the word search. The combined search still finds the right note in its first three for 3 of those 4 (missed: V2-PARA-S04). The 36 newer blind rows did not grow the slice (1 of 214 blind rows). Four questions is still too few to gate a regression; whether to write more is the owner's call. No code needed.

**A notes card with the switch off: the original text:**

A stopped answer with "Use local knowledge base" off (the settings file read false) still had a card reading "Weapon choice, From bonsAI's own note" under it; another try with the same switch off drew no card. Is that meant? The maintainer's call: that is fine (by design). Evidence `workshop:test-evidence/plan96-P96-R2-STOP-NOCARD-2.json` (the try with no card: `workshop:test-evidence/plan96-P96-R2-STOP-NOCARD-1.json`).

**The note's own words under the reply: the status paragraph:**

Most rows passed on the Deck and are closed: 01, 02, 03, 05, 06 and TEN-GAMES-01; 04's "no block" half passed 2026-10-03 (`workshop:test-evidence/plan81-NOTES-BLOCK-04.json`) and again with a game running 2026-10-14. **Still owed:** 04's "Not in my notes" line half (in Strategy or Expert). **NOTES-BLOCK-LADDER was retired by the maintainer's call 2026-10-22 (plan 98 call 11, D135): notes blocks carry no chip ladder by design now; last reading `workshop:test-evidence/plan97-NOTES-BLOCK-LADDER.json`.** (NOTES-BLOCK-07 was retired 2026-10-16: it checked Read aloud, removed in plan 86 step 3). Rows in [testing-manual.md](testing-manual.md). Older notes, word for word: [roadmap-kb-details.md](roadmap-kb-details.md#the-notes-own-words-under-the-reply).

**Glossary words: the spot-check line (kept in the entry's first version), word for word:**

Every sentence restates that game's own notes; the session spot-checked one in ten against its note.

**Glossary words: the count by kind, word for word:**

(114 Steam wiki titles, 90 own-words and GTA titles, 137 Nintendo titles)

**The knowledge library update: what the fix does, word for word:**

Update now reads both versions as dates. When the published library is older, nothing downloads, the plugin log names both versions, and the row says "You have 2026.10.17; the published library is 2026.09.26. Nothing to do." If either version does not read as a date, the old behaviour stays. The where-to-put-it half was fixed in plan 94: the first download asks (Not now / Internal storage / SD card) (`workshop:test-evidence/plan94-P94-KB-DOWNLOAD.json`).

**Wrong-subject notes: the known limits, word for word:**

**Known limits:** a long ending not on the list ("in co-op with my friends") is left to the scores; a British spelling ("armoured") can miss a note's "armor"; a junk phrase ("what time is it") names nothing, so it is untouched.

**Spoiler tiers: the report file names, word for word:**

Reports `workshop:archive/research/kb-answer-eval-2026-10-24-p98b-default.md`, `-strict.md`, `-open.md`, `-tip.md`.

**RAG Phase 7: the D112 link, word for word:**

(design C, [D112](audit/maintainer-decisions-locked.md#d112--locked-2026-09-25-raised-2026-09-25--plan-70-knowledge-base-wave-four-with-an-automated-deck-test-wave-the-twelve-calls-before-go) item 8)

**Screenshot reading: the thin-set paragraph, word for word:**

The set is thin: most games stop at a save-slot screen the rig was told never to touch, and Steam's performance overlay is on every picture. A bigger set with play scenes needs the maintainer's hand. **Step 2** (run each picture model the Deck offers, then fix where it fails) is still open. Report `workshop:archive/research/screenshot-reading-2026-10-24.md`.

**Screenshot reading: the first figures, word for word:**

First figures: 8 Deck pictures (Deep Rock Galactic: Survivor, Brotato, Hades, Half-Life 2, Black Mesa, God of War; mostly title and menu screens, one play scene), the Deck's own model `gemma4:e2b-it-qat`, 3 tries each. With the game handed over it named the game 75 times in 100 and the area 42; with nothing handed over, 17 and 29. No picture had a boss. It often invents ("a combat scene" on a title screen), guesses Zelda: Ocarina of Time for pictures it does not know, and ignored the handed-over game name on 4 of 9 God of War asks.

**The one-second wait on every question (the top-of-file paragraph), word for word:**

**The one-second wait on every question is explained.** The Deck holds one model in memory at a time, so the answering model and the note-search model push each other out. With the limit raised to two, a search after an answer dropped from 732 to 24 thousandths of a second (2026-09-12, `workshop:test-evidence/plan48-R6-deck-model-eviction.json`). The maintainer's Deck runs with two models kept loaded since 2026-09-23 (`workshop:test-evidence/plan64-FOLLOWUP-MEMORY-EVICTION.json`); the drift from August to September is still open. Two models beside a running game was measured 2026-09-26 and the safety check stays unbuilt: [detail](roadmap-details.md#cost-to-a-running-game-second-sighting).

## Plan 100 notes moved from the knowledge base roadmap (2026-10-25)

Moved word for word by the plan 100 pre-go audit, so each roadmap entry stays at five lines.

**The symptom question: the 2026-10-24 re-measure:**

Re-measured 2026-10-24 (plan 98 lane F, `workshop:archive/research/kb-embed-bakeoff-2026-10-24-arms.md`): today 8 of 24 plain problem sentences reach a tip; the held branch reaches all 24 but gets only 13 right, so it stays held. The tips were rewritten and a "none of these fit" floor now exists. Overlaps the entry of the same subject in Next.

**Unrelated questions: the older sightings:**

With a game running, "thank you very much" still attached a card on the Deck on 2026-08-23. Later floors (2026-09) may have cured some phrases.

**A troubleshooting question mostly never reaches the tips: the 2026-09 fixes:**

The tip cut-off and a false word match were fixed 2026-09-26, and the "no tip for this" line was retired 2026-09-27.

**Moved word for word by the plan 100 wave 1 docs sweep (2026-10-25), when these entries went to Deck check owed:**

**A thank-you or a junk phrase: the entry before the fix:**

- ★ `[KB]` **A thank-you or a junk phrase is treated as a follow-up to the previous question** — **OPEN, found 2026-10-24 (plan 98 block K0, Deck).**
  On Strategy and Expert turns, the previous question and answer are handed to the AI whenever the new question names no boss or enemy, with no check. "thank you very much" has no "it", so it never reaches the "it" rule; it answered the previous question again (the earlier house question) instead of a short reply. "what time is it" does pass the "it" rule. **Fresh-chat re-run 2026-10-25 (plan 100 block L0, Deep Rock Galactic: Survivor running): FAILED on two of three halves.** "thank you very much" attached no notes but still answered with 93 words of boss advice, plus a "Not in my notes" line. "what time is it" attached three notes (Praetorian, Classes, Mining and the run timer), drew a notes block, said it had no clock, then gave the boss advice. "how do I beat it" was correctly about the Praetorian. The fix is owed (plan 100 lane F). Evidence `workshop:test-evidence/plan98-P98-JUNK-PHRASES.json` and `workshop:test-evidence/plan100-P98-JUNK-PHRASES-try2.json`.

**Route look, forgotten steps: the entry before the fix:**

- ★ `[KB]` **Route look: the shown steps are forgotten when the cache is cleared** — **OPEN, found 2026-10-24 (plan 98 lane H).**
  The steps already shown are kept in the panel's browser storage, not beside the ticks in the back end's per-game save. Clear cache and leaving Strategy clear the ticks and leave the revealed steps in that storage, so a route can come back with later steps open and nothing ticked; only Clear all data removes them. Proposed fix: save them beside the ticks.

**Route look, "Needs": the entry before the fix:**

- ★ `[KB]` **Route look: no "Needs: …" part is written for steps that need an item or ability** — **OPEN, found 2026-10-24 (plan 98 lane H).**
  The screen already draws a "Needs" part when a step has one; the AI is never asked to add it. Ask it to, for a step that needs an item or ability first.

**Search tab, the section line: the entry before the fix:**

- ★ `[KB]` **Story spoilers: the Search tab's entry lands on the section line, not on the new row** — **OPEN, found 2026-10-24 (plan 98 lane B).**
  Searching for "Story spoilers" opens the section but not the "How much to hide" row.

**Yoshi's Story note: the entry before the fix:**

- ★ `[KB]` **Yoshi's Story's "Starting out" note contradicts itself about its levels** — **OPEN, found 2026-10-24 (plan 98 lane G3).**
  The note (section 376 in `data/kb/strategy_seed.json`) says "24 levels split across four worlds of six pages" and also "only six levels are played in any one run". The real game has six worlds of four levels. Lane G3 kept those numbers out of the glossary words. The note needs correcting, then a library rebuild.

**Hide more on screen: the entry before the fix:**

- ★★ `[KB]` **Story spoilers: under Hide more, a cover with no boss name in it still opens on a game with no story profile** — **OPEN, found 2026-10-24 (plan 98 lane B).**
  On screen, covers on a no-story game are opened unless they name a protected note, so the tier is not on the screen side.

**The symptom question: the entry before the wording fix:**

- ★★ `[KB]` **A troubleshooting question that only describes the symptom reaches no tips** — **ACCEPTED, held back
  2026-09-06 (D81).** "The game drops me back to the library" reaches no crash tip, because the tip search needs a topic
  word. The held fix (a meaning search) attached wrong tips, six measured; it stays held (re-measured 2026-10-24: 8 of 24 plain sentences reach a tip today, the held branch reaches all 24 but only 13 right). Older notes: [Detail](roadmap-kb-details.md#plan-100-notes-moved-from-the-knowledge-base-roadmap-2026-10-25)
  **Second opinion 2026-10-24 (plan 98 consult 2):** no score cut-off is worth building (two are already on). The fix is wording, written up in the Next entry "A troubleshooting question mostly never reaches the tips".
  [Detail](roadmap-kb-details.md#a-troubleshooting-question-that-only-describes-the-symptom-reaches-no-tips)

**A troubleshooting question mostly never reaches the tips: the entry before the wording fix:**

- ★★★ `[KB]` **A troubleshooting question mostly never reaches the tips** — **OPEN, widened 2026-09-07.** Nine of ten
  ordinary problem sentences ("my game keeps crashing") reached nothing when measured 2026-09-07, because the word "crash"
  alone is too weak to route a question. Remeasured 2026-10-24 (plan 98 lane F): 8 of 24 plain sentences reach a tip, 6 of them right (see the symptom entry in Bugs). (D81, D85) Older notes: [Detail](roadmap-kb-details.md#plan-100-notes-moved-from-the-knowledge-base-roadmap-2026-10-25)
  **Second opinion 2026-10-24 (plan 98 consult 2): fix the wording in two places (five tips and the router's topic words), not a cut-off.** Two problems have no tip at all (sound to the TV instead of headphones; menus out of place on a TV), and the 24 test sentences need their right tips written into the fixture before any gate. The word lists: [Detail](roadmap-kb-details.md#plan-98-notes-moved-from-the-knowledge-base-roadmap-2026-10-24)
  [Detail](roadmap-kb-details.md#a-troubleshooting-question-mostly-never-reaches-the-tips)

**Moved word for word by the plan 100 wave 2 docs sweep (2026-10-25), when these entries went to Deck check owed:**

**Thumbs-down follow-ups and Suggest as a tip: the entries before the fix:**

- ★★ `[KB]` **Thumbs-down: Undo shows only on the newest answer, so an older mark has no way back** — **OPEN, found 2026-10-24 (plan 98 Deck block K1).**
  Once another question is asked, an earlier answer shows no rating row and no Undo. Three marks leave a note out of the answers for good, with nothing on screen to see or clear it. A place to see and clear lowered notes is needed: a row in the Knowledge base section, which sits in the Ollama tab beside Remove. Evidence `workshop:test-evidence/plan98-P98-DEMOTE-01.json`.

- ★ `[KB]` **Thumbs-down: "ranked lower by you" stays on an answer already saved after Undo** — **OPEN, found 2026-10-24 (plan 98 lane D).**
  Show details' tag is as of the ask, so an Undo does not clear it on an answer already saved.

- ★★★★★ `[KB]` **Community tip contribution** — **OPEN, unblocked.** A reader turns a good reply into a proposed note
  with one press. **Suggest as a tip** writes a valid card to the Desktop plus a GitHub attach link. Three to five days.
  [Detail](roadmap-kb-details.md#rag-phase-7-community-tip-contribution-rag-phase-8)

**Longer text moved by the plan 100 wave 2 docs sweep (2026-10-25) to keep the knowledge-base roadmap under its size limit:**

**RAG Phase 5 entry (full text before the 2026-10-25 trim):**

164 notes. The four that had none now have enemy and item notes (plan 100, 2026-10-25): Baldur's Gate 3 7, GTA San Andreas 15, The Sims 4 15, Portal 2 14, so 29 of 38 games have them. **Measured 2026-10-25 (plan 100 lane X):** of 102 blind questions for the new notes, 100 find their note in the first three (86 in first place). But the new notes crowd the old: search overall reads 90.8 in a hundred in the first three on the held-back questions (88.1 before), and five older questions dropped out of the first three. On first turns, facts kept fell from 76.3 to 67.2 in a hundred, and contradictions read 96.3 clean against 88.9. This needs your read before it is called more than PARTIAL: see the new entry in Bugs. Also waits on P100-FOUR-GAMES-01 (block L2) and your read of the Baldur's Gate 3 notes.

**Hide more against Default (full text before the 2026-10-25 trim):**

First run: 23 covers in 100 answers against 29, and twice it missed a Hades story cover that Default kept 3 of 3. **Second run: 20.6 against 23.8.** The two Hades story rows drew their cover the same under both (3 of 3 and 2 of 3), and Hide more missed no story cover that Default kept. Contradictions: 92.6 clean against 88.9. Evidence `workshop:archive/research/kb-answer-eval-2026-10-25-p100-strict.md` against `workshop:archive/research/kb-answer-eval-2026-10-25-p100-default.md`; first run `workshop:archive/research/kb-answer-eval-2026-10-24-p98b-strict.md`.

**The new notes crowd the old ones (full text before the 2026-10-25 trim):**

The five: the Portal 2 gels, the BG3 class, an audio tip and two GTA rows. The Portal 2 gels question lost its card to the three new gel notes; six questions went from 3 of 3 to 0 of 3. Facts kept 76.3 down to 67.2 in a hundred. Search: `workshop:archive/research/kb-embed-bakeoff-2026-10-25-p100-before-arms.md` against `workshop:archive/research/kb-embed-bakeoff-2026-10-25-p100-after-arms.md`. Answers: `workshop:archive/research/kb-answer-eval-2026-10-25-p100-default.md` against `workshop:archive/research/kb-answer-eval-2026-10-25-p100-needs.md`.

**Zero-score made-up question (full text before the 2026-10-25 trim):**

Should a question with no keyword support attach nothing? A floor at no keyword support clears the two made-up bosses (Zorblax, Grimthak) but loses 3 right notes. The house and Bone Hydra questions score 3.6 to 3.8, and a floor there loses 19 right notes. The "No close match" line already shows on all four. **The numbers say no new floor.** Evidence `workshop:test-evidence/plan98-P98-NOTES-BLOCK-04.json`; floor runs `workshop:archive/research/kb-floor-holdout-2026-10-25-p100-before.json` and `...-after.json`.

**Screenshot entry note (full text before the 2026-10-25 trim):**

**2026-10-25 (plan 100 lane P, `55771b7a`), measured:** the picture rules now say the running game named to the AI is the game in the picture. The line did not help: with the game handed over the AI named it 58 and 50 times in a hundred over two runs (75 on 2026-10-24); the God of War asks named another game 4 and 6 times in 9 (4 before). Two runs differ by up to 21 points. Still PARTIAL; the step is measured, no gain. Report `workshop:archive/research/screenshot-reading-2026-10-25-p100-after.md`.

**Hollow Knight cheat section (full text before the 2026-10-25 trim):**

The route answer suggested emulator and fast-travel exploits. Odd advice from the AI, seen once. **Counted 2026-10-25 (plan 100 block L0): 0 cheat sections in 2 route questions** (plan 100 call 5, D137, chose to add no prompt line for it). **Same run: both route questions (Strategy, Hollow Knight named, nothing running) drew no step list at all, only one plain paragraph each** (no numbered steps, no "Needs" lines). Evidence `workshop:test-evidence/plan98-P98-ROUTE-01-try2.json`, `workshop:test-evidence/plan100-P100-ROUTE-CHEAT-COUNT.json`.

**Troubleshooting tips entry (full text before the 2026-10-25 trim):**

Five tips now carry the plain words people type, and two new tips (165: sound to the TV instead of headphones; 166: menus out of place on a TV, both "Researched, unconfirmed") fill the gaps. Of the 24 plain sentences, 17 now reach a tip (8 before) and 15 of the 22 that have a right tip reach it (5 before); none reaches a wrong tip. No "can't find my PC" tip exists (tips 110 and 111 are Steam Frame tips), so two sentences stay unlabelled; the lane's proposed text is in plan 100's report.

**RAG Phase 4 entry; the 2026-10-25 measure (removed words):** (PHASE4-CHIPS-01; UNCLEAR again 2026-10-24; measured 2026-10-25 with nothing running: only "How to use bonsAI" showed, 300 by 26 px, text fits, no game chips; the maintainer judges the three pictures, see its testing row)

**One-second wait paragraph; the timing (removed words):** ; with the limit at two, a search after an answer dropped from 732 to 24 thousandths of a second. The maintainer

**Suggest as a tip entry; the review note (removed words):** The security reviewer read the diff (sound; one ★ finding fixed before landing).

**Undo-only-on-newest entry; the old sighting (removed words):** The old sighting: `workshop:test-evidence/plan98-P98-DEMOTE-01.json`.

**RAG Phase 5 entry; wording (removed words):** , but the new notes crowd the old ones and facts kept fell from 76.3 to 67.2 (see the Bugs entry). Needs your read before it is called more than PARTIAL.

**Troubleshooting tips entry; unlabelled sentences (removed words):** Two sentences stay unlabelled (no "can't find my PC" tip exists).

**Hollow Knight cheat entry; no step list (removed words):** Both route questions also drew no step list, only one plain paragraph each.

**Removed words, plan 100 wave 2 sweep:** "A fresh-chat re-run 2026-10-25 (plan 100 block L0) still attached three notes for "what time is it" (`workshop:test-evidence/plan100-P98-JUNK-PHRASES-try2.json`); see the Deck check owed entry on junk phrases." and "(Doom 64: the launch tool cannot match a non-Steam shortcut; `workshop:test-evidence/plan100-STRAT-SPOIL-NAME-01.json`)".

**Removed words, plan 100 wave 2 sweep:** "Earlier sightings (2026-08-23, 2026-09): [Detail](roadmap-kb-details.md#plan-100-notes-moved-from-the-knowledge-base-roadmap-2026-10-25)" "(measured on the PC; the Deck check P100-TIPS-01 is owed)" "The maintainer's Deck keeps two loaded since 2026-09-23. Full text and evidence:" 

**Removed words, plan 100 wave 2 sweep (wording only):** "Clear asks first, then the file of marks is emptied and the notes come back on later questions." "**Known and not fixed:** an older answer's saved tag stays until a new question is asked. **Still owed:**" "Wave three's report](../../bonsAI-workshop/archive/48-kb-wave-three-session.md). More detail:" "Seven notes from Wikipedia only (its own wiki is NonCommercial): Owlbear" 

**Removed words, plan 100 wave 2 sweep (hidden spoiler entry; the dates):** "Passed on the Deck: name-first (STRAT-SPOIL-FIRST-01, 2026-09-18), knowledge base off (DRG-01b, 2026-09-23) and library absent (DRG-01c, 2026-10-03; the AI wrote no hidden block, so a cover was not tested directly)." "Word for word: [Detail](roadmap-kb-details.md#plan-98-notes-moved-from-the-knowledge-base-roadmap-2026-10-24)
  Evidence `workshop:test-evidence/plan79" 

**Removed words, plan 100 wave 2 sweep (RAG Phase 4 entry):** "The maintainer's own look at the
  pace is closed: "as they are", 2026-10-22 (plan 99 § 2 call 12)." "A running game's own tip passed on the Deck 2026-09-26. The chip promise passed on the Deck 2026-10-01 (P78-TIP-CHIP,
  P78-CHIP-PACE)." 

**Removed words, plan 100 wave 2 sweep (small trims):** "Two runs of the same setup differ by a few points." "Odd advice from the AI, seen once." "(plan 100 call 5, D137, chose to add no prompt line for it)" 

**Moved word for word by the plan 100 K9 audit (2026-10-26), to keep the knowledge-base roadmap under its size limit:**

**The five calls added to "Calls waiting on you" (full wording):**

- **Hide more draws fewer spoiler covers than Default: close or keep?** — **OPEN, raised 2026-10-25 (plan 100 lane X).**
  Measured twice: 20.6 covers in a hundred answers against 23.8 for Default, and Hide more missed no story cover that Default kept. Close it as measured, or keep it open? See the Bugs entry "Hide more drew fewer spoiler covers".
- **Hide less read 94.4 percent clean on the second run: close or keep?** — **OPEN, raised 2026-10-25 (plan 100 lane X).**
  First run 90.7, second 94.4 (51 of 54). See the Bugs entry "under Hide less".
- **A made-up question attaches three weak notes with a score of 0.00: add a floor?** — **OPEN, raised 2026-10-25 (plan 100 lane X).**
  The numbers say no new floor: it clears the two made-up bosses but loses real notes, and "No close match" already shows. Close it as "the No close match line is the answer", or keep it? See the Bugs entry "three weak notes attach".
- **Facts kept fell from 76.3 to 67.2 in a hundred: read the six questions** — **OPEN, raised 2026-10-25 (plan 100 lane X).**
  It fell after the four games' notes landed. Two earlier runs on the old library differed by up to 6 points, so the signal is weak. Six questions went from 3 of 3 to 0 of 3; read them and decide. See the Bugs entry "The new notes crowd the old ones".

**Screenshot entry, the two lines before the K9 trim:**

  First figures (8 Deck pictures, the Deck's own model `gemma4:e2b-it-qat`, 3 tries each): with the game handed over it named the game 75 times in 100 and the area 42; with nothing handed over, 17 and 29. No picture had a boss. It often invents and guesses Zelda: Ocarina of Time for pictures it does not know. Full text: [Detail](roadmap-kb-details.md#plan-98-notes-moved-from-the-knowledge-base-roadmap-2026-10-24)
  The set is thin (most games stop at a save-slot screen the rig must not touch; Steam's overlay is on every picture); a bigger set with play scenes needs the maintainer's hand. **Step 2** (each picture model the Deck offers, then fix where it fails) is still open. Report `workshop:archive/research/screenshot-reading-2026-10-24.md`. Full text: [Detail](roadmap-kb-details.md#plan-98-notes-moved-from-the-knowledge-base-roadmap-2026-10-24)

**Zero-score made-up question, the words before the K9 trim:** A floor at no keyword support clears the two made-up bosses (Zorblax, Grimthak) but loses 3 right notes; the house and Bone Hydra questions score 3.6 to 3.8 and a floor there loses 19. The "No close match" line already shows on all four. **The numbers say no new floor.**

**Hide more against Default, the words before the K9 trim:** The two Hades story rows drew their cover the same under both (3 of 3 and 2 of 3); Hide more missed no story cover that Default kept. Contradictions: 92.6 clean against 88.9.

**Screenshot entry, lane P note, the words before the K9 trim:** With the game handed over the AI named it 58 and 50 times in a hundred over two runs (75 on 2026-10-24); the God of War asks named another game 4 and 6 times in 9 (4 before). Two runs differ by up to 21 points. Still PARTIAL.

**RAG Phase 5 entry, the words before the K9 trim:** Baldur's Gate 3 7, GTA San Andreas 15, The Sims 4 15, Portal 2 14, so 29 of 38 games have them. **Measured 2026-10-25:** 100 of 102 blind questions for the new notes find their note in the first three (86 first), but the new notes crowd the old ones (see the Bugs entry), which needs your read before this is more than PARTIAL. Also waits on P100-FOUR-GAMES-01 (block L2; not run on 2026-10-25; the rig dropped; runbook written) and your read of the Baldur's Gate 3 notes.

**The new notes crowd the old ones, the words before the K9 trim:** The five: the Portal 2 gels, the BG3 class, an audio tip and two GTA rows. The Portal 2 gels question lost its card to the three new gel notes. Facts kept

**Where things stand, evidence list, the words before the K9 trim:** (`workshop:test-evidence/plan98-P98-KS-LIBRARY.json`, `workshop:test-evidence/plan98-P98-KS-RESTORE.json`)

**Still short line, the words before the K9 trim:** Of 24 fresh plain sentences, 8 reached a tip before the wording fix and 17 reach one now, none a wrong one (measured on the PC; Deck check owed).

**KB visual maps, the words before the K9 trim:** Not chosen as drawn: a fuller boss card, a whole-kingdom map. An area map must look real; maps taken from the game or a wiki need a licence check first.

**The category-card call (D41), the words before the K9 trim:** Kept open on
  purpose; the first step is to measure the shipping search question by question, so it is not yet a call to answer.

**Your eye on plan 100's wording, the words before the K9 trim:** The seven Baldur's Gate 3 notes, the two new tips (165 and 166), ten plain-word tip edits, and the wording of the "Suggest as a tip" line. On your checks page, group "plan 100".

**Phase 8 moved line, the words before the K9 trim:** **Moved here from Phase 7 (plan 100 call 8, 2026-10-26):** add-on packs come before a large catalog.

**Screenshot moved line, the words before the K9 trim:** **Moved here from Phase 7 (plan 100 call 8, 2026-10-26):** a screenshot feeding the search (the picture's guess goes into the note search) is not built.

**Unrelated questions entry, the words before the K9 trim:** "thank you very much" attached no notes; "what time is it" still attached three. A fresh-chat re-run 2026-10-25 still attached three for "what time is it"; see the junk-phrase entry in Deck check owed. Word for word:

**Two Bugs entries, the words before the K9 trim:** "Same lost-focus family as plan 97's freeze; the only cure, closing and reopening Quick Access, emptied the question box." and "(the answer came from an old branch button)".

## Plan 100 follow-up note moved from the knowledge-base roadmap 2026-10-26

**2026-10-25 (lane T follow-up, `5943260b`):** the bare word "storage" no longer routes a question to the storage tips; it needs full, space, free, left, drive, card, sd, microsd, install, gb or "out of" beside it. Found when two blind Portal 2 questions about the Weighted Storage Cube were handed the storage-full tip.
