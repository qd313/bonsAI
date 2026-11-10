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
- [Plan 100 follow-up note moved from the knowledge-base roadmap 2026-10-26](#plan-100-follow-up-note-moved-from-the-knowledge-base-roadmap-2026-10-26)
- [Plan 102 notes moved from the shelved roadmap (2026-11-02)](#plan-102-notes-moved-from-the-shelved-roadmap-2026-11-02)
- [Plan 102 notes moved from the knowledge-base roadmap (2026-11-03)](#plan-102-notes-moved-from-the-knowledge-base-roadmap-2026-11-03)
- [Plan 102 notes moved from the shelved roadmap (2026-11-03)](#plan-102-notes-moved-from-the-shelved-roadmap-2026-11-03)
- [Plan 103 notes moved from the knowledge-base roadmap (2026-11-09)](#plan-103-notes-moved-from-the-knowledge-base-roadmap-2026-11-09)
- [Plan 103 sweep K1 notes moved from the knowledge base roadmap (2026-11-09)](#plan-103-sweep-k1-notes-moved-from-the-knowledge-base-roadmap-2026-11-09)
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

## Plan 100 follow-up note moved from the knowledge-base roadmap 2026-10-26

**2026-10-25 (lane T follow-up, `5943260b`):** the bare word "storage" no longer routes a question to the storage tips; it needs full, space, free, left, drive, card, sd, microsd, install, gb or "out of" beside it. Found when two blind Portal 2 questions about the Weighted Storage Cube were handed the storage-full tip.

## Plan 102 notes moved from the shelved roadmap (2026-11-02)

Moved word for word by the plan 102 pre-go audit to keep the shelved file under its size limit.

**Picking a setting from the settings card (the entry's full text):**

A on "Enable GPU Crash Report Collection" opened Steam's System page at the top, with the toggle about 320 px below the screen edge (found 2026-10-08 on the Deck, plan 83; evidence `workshop:test-evidence/plan83-P83-J1-SETTINGS-CARD.json`). Steam's link and route calls take only a page name; the Decky libraries and the web show no way to open at, or scroll to, one setting, and a read-only probe of Steam's own page found no settings route or deep-link reader (plan 87 B6, 2026-10-09; evidence `workshop:test-evidence/plan87-B6-SETTINGS-PROBE.json`); nothing was built (the maintainer's call 9, plan 87). The maintainer's call 2026-10-10 (checks page): fine as long as it opens the right page. The wrong-page bug (A on "Enable Wi-Fi" opens System, not Internet) is separate and stays in the roadmap's Bugs.

## Plan 102 notes moved from the knowledge-base roadmap (2026-11-03)

Moved word for word by plan 102's sweep after the landings, so each roadmap entry stays at five lines.

**The Sims 4 fire notes, as the Bugs entry stood:**

- ★ `[KB]` **The Sims 4 library holds two fire notes that disagree** — **OPEN, found 2026-10-25 (plan 100 lane N3).**
  The older note "Fires" (section 112 in `data/kb/strategy_seed.json`) says there are no firefighters. The Sims wiki says they were added in a patch and come when a smoke alarm sees the fire, and the new Fire note (1200) follows the wiki. The old note needs correcting, then a library rebuild.
  **Deck 2026-10-26 (row P100-FOUR-GAMES-01), MEASURED:** "The Sims 4: how do I stop a fire" attached the older "Fires" note first, the new Fire note third, and no smoke alarm note. Evidence `workshop:test-evidence/plan100-P100-FOUR-GAMES-01.json`.

**Thumbs-down after Undo, as the Bugs entry stood:**

- ★★ `[KB]` **Thumbs-down: after Undo with a game running, Down stopped on the notes block** — **OPEN, found 2026-10-24 (plan 98 Deck block K3).**
  The page had lost the window's focus (the lost-focus family from plan 97), so Down did nothing. Closing and reopening Quick Access cleared it but emptied the question box. Same lost-focus family as plan 97's freeze. Evidence `workshop:test-evidence/plan98-P98-DEMOTE-01-game.json`.

**Screenshot reading ignores the game name, as the Bugs entry stood:**

- ★★ `[KB]` `[QA]` **Screenshot reading ignores the game name it was handed** — **OPEN, found 2026-10-24 (plan 98 lane I).**
  On God of War's play and pause pictures the Deck's AI ignored the handed-over game name in 4 of 9 asks. See the screenshot entry in Next.

**The new notes crowd the old ones, as the Bugs entry stood:**

- ★★ `[KB]` **The new notes crowd the old ones: five held-back questions lost their note from the first three and facts kept fell nine points after the four games' notes landed** — **MEASURED 2026-10-25 (plan 100 lane X), the maintainer decides.**
  The five: the Portal 2 gels, the BG3 class, an audio tip and two GTA rows. Facts kept 76.3 down to 67.2 in a hundred after the four games' notes landed; run-to-run noise is up to 6 points, so the drop needs a read before it is believed. Six questions went from 3 of 3 to 0 of 3. Reports: [Detail](archive/roadmap-trimmed-2026-10-roadmap-kb-details.md#plan-100-notes-moved-from-the-knowledge-base-roadmap-2026-10-25)

**The eval cannot yet prove the meaning search rescues many questions, as the entry stood:**

- ★★ `[KB]` **The eval cannot yet prove the meaning search rescues many questions** — **OPEN, counted 2026-10-24 (plan 98 lane F).** Only 4 labelled questions get nothing from the word search, too few to gate a regression; whether to write more is the owner's call. No code needed. Figures: [Detail](archive/roadmap-trimmed-2026-10-roadmap-kb-details.md#plan-98-notes-moved-from-the-knowledge-base-roadmap-2026-10-24)
  [Detail](roadmap-kb-details.md#eval-fixture-cannot-see-a-recall-failure)

**Card style pass, as the entry stood:**

- ★★★ `[KB]` **Card style pass** — **OPEN, measure first, added 2026-09-05.** Rewrite the prose cards as labelled short
  lines, the shape the labelled cards already use (how many cards are labelled needs a recount). Facts kept was 92% when
  measured, so the ceiling is low. Do it only if the answer test shows the labelled shape scores better.
  ([D67](audit/maintainer-decisions-archive.md#d67--locked-2026-09-05--structured-cards-accept-prose))

**KB visual maps, the route line before the Needs clause was removed:**

- ★★★ `[KB]` **KB visual maps** — **PARTIAL; two shapes picked on the mock-up board 2026-10-10, the route built 2026-10-24.** Nothing draws anything in a reply today.
  **A route, one step at a time:** built 2026-10-24 as the look of the strategy checklist (see the route-look entry in Deck check owed above). The "Needs: …" part on steps that need an item or ability landed 2026-10-25 and is owed a Deck check (see Deck check owed).
  **Your screenshot, marked**: up to three numbered marks (hit, avoid, dodge), each saying whether the Deck's AI is sure; an unsure mark is dashed. A scoring test first: a stronger model scores, out of ten, what the Deck's models mark, and helps teach them.
  Not chosen as drawn: a fuller boss card, a whole-kingdom map.
  [Mock-up board, tab 5](https://claude.ai/artifact/XyZfUSPGRZdm2P3mTGV9tR) · [notes](demos/mockup-board/README.md) · [Detail](roadmap-kb-details.md#kb-visual-maps)

**Screenshot measurement, as the entry stood:**

- ★★★★ `[KB]` `[QA]` **Measure how well the AI reads a screenshot: which game, which area, which boss** — **PARTIAL, added 2026-09-25. Step 1 done 2026-10-24 (plan 98 lane I, `6e46b9fc` to `1219b07c`): a labelled picture set and a scoring script.**
  First figures: with the game handed over the AI named it 75 times in 100 and the area 42; with nothing handed over, 17 and 29. It often invents. Full text: [Detail](archive/roadmap-trimmed-2026-10-roadmap-kb-details.md#plan-100-notes-moved-from-the-knowledge-base-roadmap-2026-10-25)
  The set is thin; a bigger one needs the maintainer's hand. **Step 2** (each picture model the Deck offers, then fix where it fails) is still open.
  **2026-10-25 (plan 100 lane P, `55771b7a`), measured: no gain.** With the game handed over the AI named it 58 and 50 times in a hundred (75 on 2026-10-24); two runs differ by up to 21 points. Still PARTIAL. Report: [Detail](archive/roadmap-trimmed-2026-10-roadmap-kb-details.md#plan-100-notes-moved-from-the-knowledge-base-roadmap-2026-10-25)
  [Detail](roadmap-kb-details.md#measure-how-well-the-ai-reads-a-screenshot) · **From Phase 7 (call 8):** a screenshot feeding the search is not built.

**RAG Phase 5, as the entry stood:**

- ★★★★ `[KB]` **RAG Phase 5: depth on the thirteen titles** — **PARTIAL.** The thirteen original titles went from 133 to
  164 notes. The four that had none now have enemy and item notes (plan 100, 2026-10-25): Baldur's Gate 3 7, GTA San Andreas 15, The Sims 4 15, Portal 2 14 (every game has at least one enemy or item note, but only seven have them as labelled cards: see Where things stand). **Measured:** 100 of 102 blind questions find their note in the first three, but the new notes crowd the old ones (see the Bugs entry). **Deck 2026-10-26 (row P100-FOUR-GAMES-01, partly open):** Portal 2 passed (the Sentry Turret and Defective Turret notes attached). GTA failed twice, then passed after the fix (`b48e4baf`; row P100-FOUR-GAMES-01-try3, evidence `workshop:test-evidence/plan100-P100-FOUR-GAMES-01-try3.json`). The Sims 4 and Baldur's Gate 3 were measured (see their entries). Stays PARTIAL for your read of the Baldur's Gate 3 notes and the call on facts kept. [Detail](archive/roadmap-trimmed-2026-10-roadmap-kb-details.md#plan-100-notes-moved-from-the-knowledge-base-roadmap-2026-10-25)
  [Plan](planning/28-phase5-corpus-depth.md) · [Detail](archive/roadmap-trimmed-2026-10-roadmap-kb-details.md#plan-100-notes-moved-from-the-knowledge-base-roadmap-2026-10-25)

**Left open by the content lanes (a note, no entry unless the maintainer judges otherwise):** seed note 221's "sixty percent off" for Grand Theft Auto IV's gun van disagrees with the wiki's prices (lane N6); seed 237's source link points at the Eyerok page while its Wiggler fact comes from the Wiggler page (lane N7).

**Mod knowledge for modded games, as the entry stood before plan 102's sources were listed:**

- ★★★ `[KB]` **Mod knowledge for modded games** — **OPEN, filed 2026-10-27 (plan 101, round 4).** Known mod problems and load-order rules for the games people mod most, so "what's wrong with my load order" and "do these two mods clash" get an offline answer that names the mods bonsAI found on the device. First source found and checked: the LOOT masterlists (the load-order tool the Bethesda modding community uses), published under CC0, with per-plugin load-after, requires, incompatible-with and warning entries for Fallout 4, Skyrim and the other Bethesda games. Cyberpunk's community modding wiki is the likely source for Cyberpunk; its licence is unchecked. Nexus Mods pages are never copied. Plan 101's research lane lists the sources and licences before any card is written; the cards and a load-order check follow as their own wave. [Plan 101](planning/101-deep-mod-ai-hints.md).

**Baldur's Gate 3's seven notes, the Deck line as the entry stood:**

  **Deck 2026-10-26, MEASURED (row P100-FOUR-GAMES-01):** "Baldurs Gate 3 how do I handle Minthara" attached the Minthara note (with Goblin Horde and Party composition). The answer names the raid and does not say how the grove ends; its tail is in `workshop:test-evidence/plan100-P100-FOUR-GAMES-01.json`. See the Phase 5 entry in Next.

**What ships loses to its own meaning half, the 2026-11-02 sentence (465-note library):**

Re-measured 2026-11-02 (plan 102 lane X2, 465-note library, held-back questions, right note in the first three): the shipping blend 90.8 in a hundred, the meaning search alone 92.2, the word search alone 85.6, so the claim held on the bigger library (`workshop:archive/research/kb-embed-bakeoff-2026-11-02-arms-p102-before.md`; the 2026-10-25 run, `...-p100-after-arms.md`, read the same).

**The eval cannot yet prove the meaning search rescues many questions, as the entry stood before it closed:**

- ★★ `[KB]` **The eval cannot yet prove the meaning search rescues many questions** — **PARTIAL, counted 2026-10-24 (plan 98 lane F); thirty questions written 2026-11-02 (plan 102 lane I, `affaead1`).**
  Only 4 labelled questions got nothing from the word search, too few to gate a regression. Lane I wrote thirty questions built to get zero word-search hits on their note, each proved against the built library. The next step is a count of how many the blend rescues (the measurement lane's second half). Figures: [Detail](archive/roadmap-trimmed-2026-10-roadmap-kb-details.md#plan-98-notes-moved-from-the-knowledge-base-roadmap-2026-10-24)
  [Detail](roadmap-kb-details.md#eval-fixture-cannot-see-a-recall-failure)

**"Where things stand", the older search and answer figures, as the paragraph stood:**

Search puts the right
note in the top three 85.3 times in a hundred on questions nobody tuned against, measured 2026-09-18 on the older library.
The Deck's own model keeps the note's facts 79.5 times in a hundred with the answer-first shape that shipped (2026-09-07). The answer test on this PC read facts kept 68.9 in a hundred on the final library (2026-11-03), 71.2 on 2026-11-02 and 67.2 on 2026-10-25, so runs differ by about four points. Do not compare either with figures from before wave
three: both checks had faults. [Wave three's report](../../bonsAI-workshop/archive/48-kb-wave-three-session.md). More:
[blind questions](roadmap-kb-details.md#blind-questions-done), [the three new games](roadmap-kb-details.md#three-new-games-and-their-notes).

**RAG Phase 5, the Deck 2026-10-26 sentence as it stood:**

**Deck 2026-10-26 (row P100-FOUR-GAMES-01):** Portal 2 passed; GTA failed twice, then passed after the fix (`b48e4baf`; row P100-FOUR-GAMES-01-try3, `workshop:test-evidence/plan100-P100-FOUR-GAMES-01-try3.json`).

**Unrelated questions can still get a game card stapled on, the Deck line as the entry stood:**

  **Deck 2026-10-24 (plan 98 block K0), MEASURED:** "what time is it" still attached three notes (re-run 2026-10-25 too); the junk-phrase fix is in [Done](roadmap.md#done-after-v060) since 2026-10-26 (row P100-THANKS-01-try2, `workshop:test-evidence/plan100-P100-THANKS-01-try2.json`). Word for word: [Detail](archive/roadmap-trimmed-2026-10-roadmap-kb-details.md#plan-98-notes-moved-from-the-knowledge-base-roadmap-2026-10-24)

**The tips entry's find-my-PC sentence, as the entry stood before it moved to Done:**

  **Plan 102 lane H (`c4d7c54a`, `82a08ad8`, `6a9e7b0a`, `943b0f86`):** a new tip 167 for a Deck that cannot find its PC; 19 of 24 plain sentences now reach a tip and 17 the right one (17 and 15 before), none a wrong one, confirmed on the final library 2026-11-03 (a count from the search-test run, no separate report file). Row P102-FINDPC-01 (block R1) is owed. Older text: [Detail](archive/roadmap-trimmed-2026-10-roadmap-kb-details.md#plan-100-notes-moved-from-the-knowledge-base-roadmap-2026-10-25)

## Plan 102 notes moved from the shelved roadmap (2026-11-03)

Moved word for word by the plan 102 Deck block R1 sweep to keep the shelved file under its size limit.

**A chip at the edge of the sliding strip, the rest of the entry's first line:**

Whether that is the design (a strip that slides) or a clipped label is the maintainer's call (plan 82, question 7). Evidence `workshop:test-evidence/plan82-P82-MAIN-WALK-NOGAME.json`, `workshop:test-evidence/plan82-P82-MAIN-WALK-GAME.json`, `workshop:test-evidence/plan82-P82-MAIN-WALK-NOGAME-chip.png`.

**The first suggestion chip reads 33 to 67 percent visible, the second line:**

  **Seen again 2026-10-12 (plan 92):** on Main the first Up from the question box lands on a chip the rig reads as only partly visible: 33 percent (`workshop:test-evidence/plan92-P92-ICONS-AFTER-try2.json`), 56 and 67 percent (`workshop:test-evidence/plan92-QA-FREE-PLAY-01-baseline.json`, `plan92-QA-FREE-PLAY-01-n2.json`; "wording changes every run"). Covered by the Quick Access rail and clipped by the chip carousel, per the first file.

**Rig and Steam quirks seen while filming, the three lines:**

  Closing the menu with B presses while a game runs stopped the GUIDE+A chord from opening it again until the game was relaunched (twice).
  The highlight can stall after a Steam box (the notes view, the AI models list); not measured further.
  The GUIDE+A chord sometimes makes Steam show a "Screenshot Taken" toast (rig only; a player presses the menu button).

**Mod knowledge, the "Found" line as the entry stood:**

  **Found:** LOOT's rule lists are CC0 (free to use), about 20 KB for Fallout 4 and 80 KB for Skyrim SE squeezed, with 76 and 87 percent of their messages checkable without opening binaries. The Cyberpunk community wiki has no licence and its maintainer says it will not get one, so only own-words cards marked "Researched, unconfirmed"; Stardew Valley's sources are NonCommercial or mixed. The build and publish checks do not accept CC0 yet. Report `workshop:planning/assets/101-mod-knowledge-sources.md`.

**RAG Phase 5, the older "Measured" sentences (plan 100):**

**Measured:** 100 of 102 blind questions for the plan 100 games find their note in the first three, but the new notes crowd the old ones (Bugs entry).

**RAG Phase 5, the game list as the entry stood:**

Grand Theft Auto V, Grand Theft Auto IV, Super Mario 64, Paper Mario: The Thousand-Year Door, Doom 64, Donkey Kong 64 and Mario Kart 64 15 each and Pikmin 2 13.

**Screenshot measurement, the step 2 model figures:**

with today's shape and the game handed over, qwen3.5:4b named the game 97 and the place 70 times in a hundred, gemma4:e4b-it-qat 97 and 64, qwen2.5vl:3b 100 and 36, llava:7b 97 and 6, against the Deck's starter model's 67 to 70 and 52 to 53.

**The crowding entry's second line before 2026-11-03:**

  Mostly noise: of the six questions behind the nine-point fall in facts kept, only the Portal 2 gels is a worse answer (0 of 13 on today's library); two have too-narrow phrase lists and three are noise (the unchanged library read 71.2 against 67.2). **One real cause in the search:** after the 51 notes the word search returns up to ten notes instead of three, which pushes a note found only by meaning down the blend; four of the five lost slots are worse for a player.

**The eight thin games' notes, the landing commits as the entry listed them:**

118 notes in the labelled shape: Grand Theft Auto V 15 (`5b0ebf02`), Grand Theft Auto IV 15 (`0e0de2da`), Super Mario 64 15 (`df5c3fec`), Paper Mario: The Thousand-Year Door 15 (`db539690`), Pikmin 2 13 (`6cb02fde`), Doom 64 15 (`50a63bd1`), Donkey Kong 64 15 (`83f16b05`), Mario Kart 64 15 (`dc63a4f7`).

**Hidden spoiler box, the Still owed line as the entry stood:**

  **Still owed:** STRAT-SPOIL-NAME-01 could not run again on 2026-11-03 (plan 102 block R0: Doom 64 was not running and a stuck suspend overlay blocked the Home shelf; `workshop:test-evidence/plan102-STRAT-SPOIL-NAME-01.json`; before that 2026-10-25, `workshop:test-evidence/plan100-STRAT-SPOIL-NAME-01.json`): it needs the maintainer's hand launch (on the checks page). [Detail](archive/roadmap-trimmed-2026-10-roadmap-kb-details.md#plan-98-notes-moved-from-the-knowledge-base-roadmap-2026-10-24)

## Plan 103 notes moved from the knowledge-base roadmap (2026-11-09)

Moved word for word by plan 103's audit before anything lands, to make room in the knowledge-base roadmap (it was 0.2 KB under its limit). Each entry there keeps a link here.

**The four calls the maintainer answered on 2026-11-09 (D140), as the list stood. Closed by call 5 of D140: the picture sentence is kept, the crowding fix is built (plan 103 lane R1), the card style pass is closed, and the story-cover check is re-run with more tries (plan 103 lanes T2 and X0):**

- **Keep or undo "This screenshot is from <game>." at the start of a picture question?** — **OPEN, raised 2026-11-03 (plan 102 lane D, call 5).**
  With the game handed over the AI named the right game 91 and 92 times in a hundred (67 and 70 before) and never mixed up God of War, but named the place on screen only 29 and 30 times (52 and 53 before). It is on by default now. Row P102-PICTURE-01 could not run on 2026-11-03 (the Deck saved no screenshot) and is owed. Reports `workshop:archive/research/screenshot-reading-2026-11-02-p102-s1-run1.md` and `-s1-run2.md`.
- **Stop the word search handing the blend ten notes? (the crowding fix)** — **OPEN, raised 2026-11-03 (plan 102 lane E).**
  The fall in facts kept is mostly noise, but after 51 more notes the word search returns up to ten notes instead of three, so one-word coincidences beat a note found only by meaning. The fix (cap the list before blending, or move the floor) touches the search service. See the Bugs entry "The new notes crowd the old ones".
- **Close the card style pass?** — **OPEN, raised 2026-11-03 (plan 102 lane G).**
  A tie: fifteen prose cards rewritten in the labelled shape kept every fact in 48 of 90 answers against 44 of 90, while the same library swung 18 points between its own two runs. The rewrites are kept (`workshop:archive/research/card-style-rewrites-2026-11-02-p102.patch`). See the Next entry.
- **Re-run the "cover on a story question" check with more tries?** — **OPEN, raised 2026-11-03 (plan 102 lane X2).**
  On the final library a cover showed up on a story-beat question in 11 of 15 answers, against 14 of 15 on 2026-10-25 (plan 100) (three tries on five questions, so one or two answers can swing it). It is a read, not yet a finding. Report `workshop:archive/research/kb-answer-eval-2026-11-03-p102-after.md`.

**Crowding entry, the final-library paragraph as it stood:**

**Final library, 2026-11-03 (lane X2):** of the 236 blind questions for the eight games one older right note slipped out of the first three (a Mario Kart 64 question: "Items and who gets them" fell behind the new "Picking a kart for top speed"), the same cause in one case. The five of the thirty meaning-only questions that the blend loses but the meaning search alone finds (23 against 28) are the same cost. Report `workshop:archive/research/kb-crowding-read-2026-11-02-p102.md`, the phrase-list patch beside it, and `workshop:archive/research/kb-embed-bakeoff-2026-11-03-arms-p102-after.md`. 

**The "Still short" paragraph, as it stood:**

**Still short:** getting to the troubleshooting tips, though better since 2026-10-25. Of 24 fresh plain sentences, 8 reached a tip before the wording fix, 17 after it and 19 now (17 the right one, 15 before the find-my-PC tip of 2026-11-02; counted again on the final library 2026-11-03, rows 19 and 20 reach tip 167), none a wrong one (PC). On the Deck 2026-10-26, 2 of 3 plain sentences reached their tip; the third (a crash sentence) did after the fix, in a chat about another game and, reworded, in a Hollow Knight chat (row P100-TIPS-01-try3).

**RAG Phase 5, the Measured paragraph, as it stood:**

  **Measured:** older results in [Detail](roadmap-kb-details.md#plan-102-notes-moved-from-the-knowledge-base-roadmap-2026-11-03). **Final library, 2026-11-03:** 230 of the 236 blind questions for plan 102's eight games find their note in the first three (203 first); the word search alone 227, the meaning search alone 224 (`workshop:archive/research/kb-embed-bakeoff-2026-11-03-arms-p102-after.md`). **Deck 2026-10-26:** Portal 2 and (after the fix `b48e4baf`) GTA passed; older text in [Detail](roadmap-kb-details.md#plan-102-notes-moved-from-the-knowledge-base-roadmap-2026-11-03). Plan 102's notes passed their Deck row (8 of 8, 2026-11-03) and are owed your read (Deck check owed). **Closes** (plan 103 § 5f) when the 23 games' notes and their questions are in, the crowding fix has landed or been turned down on its numbers, and its Deck row P103-NOTES-23-01 has passed; the ten-note samples are a call (Calls), and the chip order is its own entry above. Stays PARTIAL until then.

**The meaning-half entry, the 2026-11-03 re-measure, as it stood:**

**Re-measured on the final library (2026-11-03, plan 102 lane X2, 583 notes, 628 held-back questions, right note in the first three):** the shipping blend 92.5 in a hundred, the meaning search alone 92.4, the word search alone 85.0: a tie on the bigger set (this morning, on 465 notes and 360 questions: 90.8, 92.2 and 85.6). Report `workshop:archive/research/kb-embed-bakeoff-2026-11-03-arms-p102-after.md`.

**The screenshot measurement entry, steps 1 and 2, as they stood:**

Step 1: a labelled picture set and a scoring script; with the game handed over the AI named it 75 times in 100 (58 and 50 on 2026-10-25; runs differ by up to 21 points). **Step 2, on this PC:** the picture models the Deck offers read far better than its starter model (qwen3.5:4b named the game 97 and the place 70 times in a hundred, against 67 to 70 and 52 to 53); the other figures are in [Detail](roadmap-kb-details.md#plan-102-notes-moved-from-the-knowledge-base-roadmap-2026-11-03). Reports `workshop:archive/research/screenshot-reading-2026-11-02-p102-*.md` (ten files).

**The mod-knowledge entry, the Found paragraph, as it stood:**

  **Found:** LOOT's rule lists are CC0 (free to use); the Cyberpunk community wiki has no licence and will not get one (own-words cards marked "Researched, unconfirmed" only); Stardew Valley's sources are NonCommercial or mixed. The build and publish checks do not accept CC0 yet. Sizes and shares: [Detail](roadmap-kb-details.md#plan-102-notes-moved-from-the-knowledge-base-roadmap-2026-11-03). Report `workshop:planning/assets/101-mod-knowledge-sources.md`.

**Older sentences moved out so each entry stays short, as they stood:**

Mostly noise: of the six questions behind the nine-point fall in facts kept, only the Portal 2 gels is a worse answer; two have too-narrow phrase lists and three are noise.

**Older sentences moved out so each entry stays short, as they stood:**

Every sentence comes from a wiki page the fetcher read; the FOSS reviewer read every file and nothing blocks publishing (Paper Mario had five story-spoiler risks, fixed before landing).

**Older sentences moved out so each entry stays short, as they stood:**

The thumbs-down rows now ask the panel's window for its focus when the ring lands on them, and Down from the notes block no longer dies when the page lacks focus: the press gives way and Steam moves the ring. **Say plainly:** on the Deck the ring will most likely land on the suggestion chips, past the open details panel, a moving press and not yet the stop a person expects (the Bugs entry above).

**Older sentences moved out so each entry stays short, as they stood:**

plan 100 gave the four that had none enemy and item notes (Baldur's Gate 3 7, GTA San Andreas 15, The Sims 4 15, Portal 2 14) and **plan 102 (2026-11-02) gave eight thin games 118 more** (15 each, Pikmin 2 13; the games are named in the eight-games entry in Deck check owed).

**Older sentences moved out so each entry stays short, as they stood:**

Five of the seven are tabletop lore with no fight advice; you read them in the chat on 2026-10-25 and chose to land them (D137 session).

**Older sentences moved out so each entry stays short, as they stood:**

Passed on the Deck: name-first (STRAT-SPOIL-FIRST-01), knowledge base off (DRG-01b) and library absent (DRG-01c; no hidden block was written, so a cover was not tested directly).

**Older sentences moved out so each entry stays short, as they stood:**

Leaning the search toward meaning finds the right note first a little more often, but it would bury a new
  note with no meaning index yet. That reason is gone since 2026-09-07 (every note is now guaranteed an index), but two
  other objections stand.

**Older sentences moved out so each entry stays short, as they stood:**

**A route, one step at a time:** built 2026-10-24 as the look of the strategy checklist (its entry is in Done). The "Needs: …" part on steps that need an item or ability was removed 2026-11-03 (`9615dc19`): it was never drawn in the Deck tries (Done).

**Older sentences moved out so each entry stays short, as they stood:**

The junk-phrase fix is in [Done](roadmap.md#done-after-v060) since 2026-10-26 (row P100-THANKS-01-try2, `workshop:test-evidence/plan100-P100-THANKS-01-try2.json`); the 2026-10-24 Deck sightings: [Detail](roadmap-kb-details.md#plan-102-notes-moved-from-the-knowledge-base-roadmap-2026-11-03)

**Older sentences moved out so each entry stays short, as they stood:**

plan 100 added 51 notes and two tips, and plan 102 added 118 notes for eight games and one tip. 

**Older sentences moved out so each entry stays short, as they stood:**

  **Deck 2026-10-26, MEASURED (row P100-FOUR-GAMES-01):** the Minthara question attached the Minthara note; the answer does not say how the grove ends. Words and evidence: [Detail](roadmap-kb-details.md#plan-102-notes-moved-from-the-knowledge-base-roadmap-2026-11-03).

**Older sentences moved out so each entry stays short, as they stood:**

  **As of 2026-10-03:** the source study is done, and the library is at 38 games and 414 notes
  ([D111](audit/maintainer-decisions-locked.md#d111--locked-2026-09-17-raised-2026-09-17--58-phase-1-the-notes-own-words-on-screen-and-wiki-notes-taken-without-rewriting--nine-calls-before-the-build)).

**Older sentences moved out so each entry stays short, as they stood:**

The answer test on this PC read facts kept 68.9 in a hundred on the final library (2026-11-03), 71.2 on 2026-11-02 and 67.2 on 2026-10-25, so runs differ by about four points. Older search and answer figures (85.3 and 79.5 in a hundred, 2026-09), with the wave three caveat: [Detail](roadmap-kb-details.md#plan-102-notes-moved-from-the-knowledge-base-roadmap-2026-11-03).

**Still short:** getting to the troubleshooting tips, though better since 2026-10-25: 19 of 24 fresh plain sentences reach a tip now, none a wrong one (PC). Counts and Deck tries: [Detail](roadmap-kb-details.md#plan-103-notes-moved-from-the-knowledge-base-roadmap-2026-11-09).

**The one-second wait on every question is explained:** the Deck holds one model at a time, so the answering and note-search models push each other out. Full text and evidence: [detail](archive/roadmap-trimmed-2026-10-roadmap-kb-details.md#plan-98-notes-moved-from-the-knowledge-base-roadmap-2026-10-24).

**Older sentences moved out so each entry stays short, as they stood:**

Every one of the 38 games has at least one enemy or item note (counted 2026-11-02); with plan 102, 15 of them have those notes in the labelled short-line shape (7 before).

**Older sentences moved out so each entry stays short, as they stood:**

Seen three times (once in a chat with one list, twice with two). 

**Older sentences moved out so each entry stays short, as they stood:**

Older turns collapse under "N earlier", so two lists never show at once.

**Older sentences moved out so each entry stays short, as they stood:**

The cover was drawn under Default and stayed shut, as under Hide more. "Open after consent" was off in the test, so this may be by design; the evidence file leaves it to the owner.

## Plan 103 sweep K1 notes moved from the knowledge base roadmap (2026-11-09)

Written by the plan 103 bookkeeper sweep K1 after the first landing chain and Deck block D0a. Older text is moved word for word, each piece headed by where it stood; the findings the note writers and helpers left are at the end.

**Entries and sentences as they stood before this sweep:**

**Where things stand, the answer-test sentence:**

The answer test on this PC read facts kept 68.9 in a hundred on the final library (2026-11-03); runs differ by about four points. Older figures: [Detail](roadmap-kb-details.md#plan-103-notes-moved-from-the-knowledge-base-roadmap-2026-11-09)

**Calls: the ten-note samples line:**

- **Your ten-note samples** — **OPEN, raised 2026-11-09 (D140, call 4).**
  One sample of ten random notes for the 125 notes from plans 100 and 102, and one per batch of plan 103; each is added here when its sample file exists.

**Bugs: Brotato cover (as it stood):**

- ★ `[KB]` **On a no-story game named in the question, with nothing running, a cover under Default does not open by itself (Brotato, 2026-11-03)** — **OPEN, found 2026-11-03 (plan 102 Deck block R0).**
  The cover was drawn under Default and stayed shut, as under Hide more. **Cause read 2026-11-09 (plan 103 lane S1):** the rule that opens a cover by itself looks only at the running game, and Brotato is on the no-story list by its Steam number only, in neither name list (screen or back end). Evidence `workshop:test-evidence/plan102-P100-HIDE-MORE-SCREEN-01-try2.json`.

**Bugs: covered answer draws no notes chip (as it stood):**

- ★ `[KB]` `[ui]` **A spoiler-covered answer draws no notes chip** — **OPEN, found 2026-11-03 (plan 102 Deck block R1).**
  A Grand Theft Auto IV answer came back as a full spoiler cover and showed no notes chip; the log and the saved chat show the three notes (`workshop:test-evidence/plan102-P102-THIN-GAMES-01.json`). **By design in the code:** the notes line waits while a cover is shut; plan 103 measures it (row P103-M-COVERED-NOTES) and draws a caption (lane S1, D140 call 14). The Fallout 4 computer-terminal sighting is in the other file (`plan102-P102-FINDPC-01.json`) and is a weak-match case (a "No close match" line), not a covered one.

**Bugs: one open cover and every answer's notes line (as it stood):**

- ★★ `[KB]` `[ui]` **Opening a spoiler cover on one answer lets the notes line show under every answer** — **OPEN, found 2026-11-09 by reading the code (not seen on the Deck).**
  One page-wide "a cover is open" switch decides it, so a protected note's name could show under an answer that is still covered. Plan 103 lane S1.

**Bugs: the answer test's samples (as it stood):**

- ★★ `[KB]` `[QA]` **The answer test's samples are not independent: the same prompt gave the identical reply three times, so three samples can be one** — **OPEN, found 2026-11-02 (plan 102 lane E).**
  No seed is sent with a question, and no answer cache was found in the back end though the lessons file says one exists; plan 103 lane T2 settles it. It makes six questions at 0 of 3 together easy to produce with nothing changed. Report `workshop:archive/research/kb-crowding-read-2026-11-02-p102.md`.

**Bugs: the crowding entry's heading (as it stood):**

- ★★ `[KB]` **The new notes crowd the old ones: five held-back questions lost their note from the first three after the four games' notes landed** — **MEASURED 2026-10-25 (plan 100 lane X), read 2026-11-02 (plan 102 lane E); the maintainer's call 2026-11-09: build the fix (plan 103 lane R1).**

**Next: the honest-answer entry (as it stood):**

- ★★★ `[KB]` **The AI almost never admits that no note covers the question: 3 and 4 of 24 in two runs** — **OPEN, measured 2026-11-02 and again 2026-11-03 (plan 102 lanes F and X2).**
  On eight questions no note can answer, the AI admitted it in 3 of 24 replies the first time (all three the back end's "No close match" footer, none its own words) and 4 of 24 on the final library, and answered as if it knew in 21 and 20 of 24. The open step is prompt work. Reports `workshop:archive/research/kb-answer-eval-2026-11-02-p102-unknown.md` and `workshop:archive/research/kb-answer-eval-2026-11-03-p102-after.md`. The deeper answer checks that found it are built (Done).

**Next: mod knowledge, the Next step sentence (as it stood):**

**Next step:** written permission from the Cyberpunk wiki's admins, and CC0 in the two checks. **Plan 103** runs the basics tips (plan 101's knowledge-cards lane) and the CC0 change (lanes G1 and T3); the device side stays plan 101's.

**Next: screenshot measurement, the set sentence (as it stood):**

The set is 11 pictures and none shows a boss; a bigger one needs the maintainer's hand.

**Bugs: unrelated questions entry, the junk-phrase sentence:**

  The junk-phrase fix is in [Done](roadmap.md#done-after-v060) since 2026-10-26 (row P100-THANKS-01-try2).


**Deck check owed: Baldur's Gate 3 entry, the Minthara line:**

  **Deck 2026-10-26, MEASURED (row P100-FOUR-GAMES-01):** the Minthara question attached the Minthara note. [Detail](roadmap-kb-details.md#plan-103-notes-moved-from-the-knowledge-base-roadmap-2026-11-09)


**Next: Phase 5, the measured paragraph (as it stood):**

  **Measured, final library 2026-11-03:** 230 of the 236 blind questions for plan 102's eight games find their note in the first three (`workshop:archive/research/kb-embed-bakeoff-2026-11-03-arms-p102-after.md`); on the Deck 2026-11-03 their row passed 8 of 8 (Deck check owed). Older results: [Detail](roadmap-kb-details.md#plan-103-notes-moved-from-the-knowledge-base-roadmap-2026-11-09).


**Bugs: Speed mode entry, the fix sentence:**

 A stray word match can attach a wrong tip. A fix would run the meaning search only when the word hits are thin;
  that needs a cut-off picked and measured.

**Bugs: meaning-half entry, the re-measure sentence:**

 **Re-measured on the final library (2026-11-03, 583 notes, 628 held-back questions):** blend 92.5 in a hundred, meaning search alone 92.4, word search alone 85.0, a tie ([Detail](roadmap-kb-details.md#plan-103-notes-moved-from-the-knowledge-base-roadmap-2026-11-09)).

**Next: honest-answer entry, the earlier-figures sentence:**

 The earlier figures (3 and 4 of 24 in plan 102) came from the test before it was repaired and counted the back end's line as an admission.

**Wording of this sweep's own first lines, before they were shortened to fit the size limit:**

**Deck check owed: thumbs-down entry, the 2026-11-03 sentences (as they stood):**

**Deck 2026-11-03 (block R1, row P102-UNDO-FOCUS-01), UNCLEAR, not a pass:** the page's window focus read true in all five reads (the mark and four reopens) with the game running, so the lost-focus state never happened and the Down walk was not run. Evidence `workshop:test-evidence/plan102-P102-UNDO-FOCUS-01.json`. 

**Deck check owed: thumbs-down entry, the closing sentences (as they stood):**

 Its "before the fix" reading (row P98-DEMOTE-01-game-try2) can no longer be taken, because the fix has been on the Deck's build since 2026-11-03; that half is dropped. Evidence of the first sighting `workshop:test-evidence/plan98-P98-DEMOTE-01-game.json`.

**Deck check owed: screenshot-name entry, the PC numbers and the first try (as they stood):**

On the PC the game was named 91 and 92 times in a hundred (67 and 70 before) and the place 29 and 30 (52 and 53 before). Row P102-PICTURE-01 could not run on 2026-11-03: the Deck's own capture (Steam + R1) saved no screenshot in two tries and "Attach recent screenshot" attached nothing, so nothing about the shape was tested (`workshop:test-evidence/plan102-P102-PICTURE-01.json`). Still owed. 

**Deck check owed: hidden-box entry, the 2026-11-03 cause (as it stood):**

(plan 102 block R0: Doom 64 was not running and a stuck suspend overlay blocked the Home shelf; `workshop:test-evidence/plan102-STRAT-SPOIL-NAME-01.json`): the rig can now launch

**Next: honest-answer entry, also-landed sentence:**

 Also landed with it: the "Looks like" label is kept as a bullet, and the finale rule for versus-style notes.

**Where things stand: the tooling paragraph (as I first wrote it):**

Test tooling since 2026-11-09: test questions can live in many files (`tests/fixtures/kb_eval/`), the search test's saved library notices new notes files, and two one-call Deck check scripts exist (`scripts/deck_kb_readback.py`, `scripts/deck_place_picture.py`; security read clean, not yet tried on the Deck). Plan 103's notes for ten games are written, checked and landing; see Phase 5.

**Next: mod knowledge, the Stardew sentence:**

 **One correction owed to plan 101:** its Stardew recipe puts SMAPI's log under the game folder, but SMAPI's own source puts it under the game's app-data folder.

**Next: screenshot measurement, the Found sentence:**

 **Found:** `py_modules/backend/ask/game_ai_request.py` is at 797 of its 800 lines after the honest-answer change; the picture-search lane must move a piece out before it adds its call site.

**Next: Phase 5, the closing pointer:**

Details and the licence question for the Red Dead wiki: [Detail](roadmap-kb-details.md#plan-103-sweep-k1-notes-moved-from-the-knowledge-base-roadmap-2026-11-09).

**Deck check owed: eight thin games, the Deck sentence (as it stood):**

 236 blind questions for them are in the search test (lane Q2, tip `76f3619d`). **Deck 2026-11-03 (block R1, row P102-THIN-GAMES-01), PASSED 8 of 8:** one question per game by name attached a note from the new files (notes 1409, 1502, 1600, 1704, 1814, 1906, 2004, 2108) and the Paper Mario answer gave away no story beat. Evidence `workshop:test-evidence/plan102-P102-THIN-GAMES-01.json`.

**Bugs: crowding entry, the R1 paragraph (as I first wrote it):**

**Plan 103 lane R1, 2026-11-09:** the plain version at 5 failed one of decision D82's three protected tests and pushed an exact-match note ("Enemy Hydra jets") from first to third. The narrow version passes D82's tests and gains 8 held-back questions with none lost in the search test, but with the game's name typed two questions lose their right note (V2-P102-GTAIV-12, V2-BLINDT-19), which breaks the rule that nothing may be lost. The trade (about nine questions gained for two lost when the name is typed) is the maintainer's call. Record and patches `workshop:archive/research/kb-crowding-fix-2026-11-09-p103-r1.md`.

**Where things stand: the tooling paragraph (second version):**

Test tooling since 2026-11-09: questions can live in many files (`tests/fixtures/kb_eval/`), the search test's saved library notices new notes files, and two one-call Deck check scripts exist (not yet tried on the Deck). More: [Detail](roadmap-kb-details.md#plan-103-sweep-k1-notes-moved-from-the-knowledge-base-roadmap-2026-11-09).

**Next: Phase 5, the games list:**

written and checked, landing: Left 4 Dead 2, Fallout 4, Red Dead Redemption 2, Cyberpunk 2077, Mario Party, Mario Party 2, 3, 6 and 7 and Super Smash Bros. (14 or 15 each). Written and checked, licence read owed: Melee and Grand Theft Auto III (15 each).

**Deck check owed: Brotato entry, the limit sentence:**

 Known limit: with no note attached the screen still cannot tell the game.

**What the answer test's repair found (plan 103 lane T2, 2026-11-09):** the three tries of a question were asked as follow-ups of the try before, and no seed was sent. There is no answer cache in the plugin (both sides were searched). The test now sends a seed per try and every try is a first turn. "Admitted not knowing" is two counts now: the back end's own footer line, and the AI saying so in its own words. Reports `workshop:archive/research/kb-answer-eval-2026-11-09-p103-before-run1.md`, `-run2.md` and `-story.md`. Facts kept read 73.4 and 71.8 in a hundred (two points either way is noise). On the eight questions no note can answer, the AI said so in its own words 0 of 24 in both runs, the back end's line showed 3 of 24, and it answered as if it knew 21 of 24. Story cover showed 39 of 45; the Hades question 5 of 9. So the call "re-run the story-cover check with more tries" (D140) is done: 39 of 45. Every older answer-quality figure must not be compared with these.

**Test tooling that landed (plan 103, 2026-11-09):** test questions can live in many files under `tests/fixtures/kb_eval/` (one reader for the main file and the folder), and the search test's saved library notices new notes files and glossary files. The library's checks accept CC0 sources (lane T3). Two one-call Deck check scripts exist, `scripts/deck_kb_readback.py` and `scripts/deck_place_picture.py`; the security read was clean and neither has been tried on the Deck yet (the Deck was stuck after block D0a).

**Notes for the 23 games, status on 2026-11-09:** written and checked, landing as one batch: Left 4 Dead 2 (15), Fallout 4 (14), Red Dead Redemption 2 (14), Cyberpunk 2077 (15), Mario Party (15), Mario Party 2 (14), Mario Party 3 (15), Mario Party 6 (15), Mario Party 7 (15), Super Smash Bros. (15). Written and checked, licence read still owed: Melee (15), Grand Theft Auto III (15). No notes: Hades (its wiki is CC BY-NC-SA, which the library cannot use; Wikipedia has too little), so at most 37 of the 38 games get enemy and item notes from this plan. Not written yet: Half-Life 2 (its wiki, combineoverwiki.net, was read-only all evening; Black Mesa uses the same wiki) and nine more games (Yoshi's Story, Diddy Kong Racing, Fallout: New Vegas, Brotato, Palworld, Skyrim, Hollow Knight, Black Mesa, DOOM Eternal). `data/kb/NOTICE.md` gained a Red Dead Wiki row; its licence version (3.0) rests on Fandom's help page, and one 2009 page on that wiki says GFDL, so the maintainer confirms before publishing (plan 103 § 12, question 4). Blind test questions for these notes are not written yet. Ten-note samples: `workshop:checks/plan103-sample-earlier.md`, `workshop:checks/plan103-sample-B.md`, `workshop:checks/plan103-sample-C.md`.

**Older notes the wiki contradicts, the writers' list (2026-11-09; plan 103 lane M takes them):** Left 4 Dead 2: the Charger note says only explosives stumble him, but the wiki says the grenade launcher does not. Mario Party: Eternal Star's odds; "Bowser wanders" on DK's Jungle Adventure; the Bonus Star wording; the Blue-to-Red change on Magma Mountain lasts two turns, not "until the board resets". Mario Party 2: the Dueling Glove's wager and referee; the Bowser Space roulette. Mario Party 6: "the only way to get more Stars" on Snowflake Lake; duels only in the last five turns. Mario Party 7: Pagoda Peak's Star price; Windmillville's full ownership; eight players only in 4-Team Battle; Bowser's Enchanted Inferno has its own mechanic; the Snack Orb's two turns. Super Smash Bros.: the 1P Game note lists two of three bonus stages. Cyberpunk 2077: iconic weapons can be bought. Grand Theft Auto III: a police bribe removes one star, not the whole meter.

**Other findings, one line each:** (1) Grand Theft Auto III in the library is the Definitive Edition, but its wiki describes the original game; lines that could differ now say "In the original game". A check on the Deck would settle them. (2) `py_modules/backend/notes/kb_tip_suggestion_service.py` (about line 56) allows five note kinds for a player's suggested tip; the five new kinds (versus, coop, callout, survival, realism) fall back to "mechanic" there. Not a bug yet. (3) Plan 101's Stardew recipe puts SMAPI's log under the game folder; SMAPI's own source puts it under the game's app-data folder. (4) `py_modules/backend/ask/game_ai_request.py` is at 797 of its 800-line limit after the honest-answer change; the picture-search lane (P2) must move a piece out before it adds its call site. (5) With the honest-answer change the "Looks like" label is kept as a bullet, and the finale rule for versus-style notes landed (spoiler rules page, rule 14). (6) Plan 103's first audit invented four row ids the plan did not name (P103-DP-MODELS, P103-SWEEP, QA-LOOK-01-p103, P103-DR-RESTORE); they are kept.
