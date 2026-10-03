# Roadmap details: knowledge base and RAG

> Moved out of [roadmap-details.md](roadmap-details.md) word for word on 2026-10-03 (plan 80, step 3). The long notes for the entries in [roadmap-kb.md](roadmap-kb.md), plus knowledge-base notes no entry links to yet.

## Ordinary phrases attach game cards

  - **Implemented 2026-08-23:** `VECTOR_RECALL_FLOOR` raised `py_modules/backend/services/knowledge_base_service.py:148` from 0.50 to 0.515, against a fresh local repro (real `nomic-embed-text` via a local Ollama, real seed cards for the six phrases and the seven `V2-PARA-*` strategy rows in `kb_eval_v2.json` — script not committed). The two ranges overlap (noise up to 0.5308, a genuine paraphrase hit as low as 0.4302), so no single floor separates them cleanly; 0.515 was chosen to sit just above "one sentence"'s noise score (0.5034) and just below the lowest genuine score this change must not break (Mind Flayer / `V2-PARA-S04`, 0.5169).
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

    **Method — and the correction it forced.** The card names are **not readable from the device UI**: *Show details* reports retrieval mode, `Trust tier`, and a corpus section count, but never names what was retrieved, and a `fallback_no_source` tier looks identical whether the payload was the genre fallback or a real game card. An earlier note on this row read that chip as "no cards attached" for *"one sentence"* — **that was wrong**, and the conclusion was only accidentally right. `kb_attached: true` was in the same snapshot the whole time, and `fallback_no_source` is a **trust tier** ([knowledge_base_schema.py:48](../py_modules/backend/services/knowledge_base_schema.py#L48)), not an attachment count. The authoritative source is the Desktop ask trace — `~/Desktop/bonsAI_logs/bonsai-ask-trace-<date>.md`, written when `desktop_ask_verbose_logging` is on ([main.py:2135](../main.py#L2135)) — which dumps the verbatim `--- Local knowledge base ---` block with one `[title / kind: Card] (trust: tier)` header per attached card. **Read the trace, not the panel**, for any card-attachment QA.

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
  available — so the one split it is legal to tune against said "change nothing" while the gate said otherwise. **Groundwork done:** 51
  blind rows added to `tune`, which had none ([audit/kb-blind-tune-rows-2026-08-29.md](archive/kb-blind-tune-rows-2026-08-29.md)). Run of
  record: [archive/research/kb-embed-bakeoff-2026-08-29-arms.md](archive/research/kb-embed-bakeoff-2026-08-29-arms.md).

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
  holdout rows, before any of them were scored. The compat router reaches a question that **names** a topic and not one that only says
  what is going wrong: *"the game drops me back to the library a few minutes in"* (`V2-BLIND-H55`) never routes, because the word *crash*
  is absent; *"my controller works fine on the desktop but the game doesn't seem to see half my buttons"* (`V2-BLIND-H19`) never routes,
  because the word *input* is absent. **Two of the four blind compat rows miss.** This is the D16 gate doing what it was specified to do —
  word-boundary topic matching replaced the old literal `deck`/`proton` phrase gate — so it is a reach limit rather than a regression, and
  the fix is a maintainer call, not a threshold tweak. Neither row was reworded to make it pass; both are named in the reach pin
  (`tests/test_compat_topic_router.py`). Worth noting the shape: a card-derived question about crashes says *crash*, so this hole was
  invisible until questions were written without reading the cards. Detail:
  [audit/kb-blind-holdout-rows-batch2-2026-08-28.md](archive/kb-blind-holdout-rows-batch2-2026-08-28.md) § 5.

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
`docs/test-evidence/plan47-R4-problems-reach-tips.json`.

**More history, moved from the roadmap 2026-09-21:**

- ★★ `[KB]` **A troubleshooting question that only describes the symptom reaches no tips** — **ACCEPTED, held back
  2026-09-06, re-measured 2026-09-07 and still held (D52, D81).** The fix does reach further: with nothing running, all 24
  fresh plainly-worded problem sentences get into the search, against 8 without it, and *"thank you very much"* still
  attaches nothing. **But what comes back is wrong** — six measured examples, each attaching a tip about something else
  entirely, such as the on-screen keyboard for *"game wont even open"*. A wrong tip is worse than none, which is the same
  objection that held it the first time. **The cause is now clear, and it is the useful part.** The meaning search only
  runs when nothing else finds anything, and that almost never happens: a plain word search across 156 tips nearly always
  finds something by shared words, so it wins first with a poor match and the meaning search never gets a turn. **What is
  missing is not a wider gate — it is a way to say "none of these tips fit."** Until there is one, opening the gate makes
  things worse. The real fix is rewriting the tips, filed as its own entry below. All six wrong tips:
  [detail](roadmap-details.md#a-troubleshooting-question-that-only-describes-the-symptom-reaches-no-tips).

*Moved out of the roadmap on 2026-09-21, superseded by the current summary there.*

## Unrelated questions still get game cards stapled on (2026-09-02 wording)

See also [Ordinary phrases attach game cards](#ordinary-phrases-attach-game-cards) above.

- ★★ **Unrelated questions still get game cards stapled on** — **PARTIAL; the maintainer chose to live with it 2026-08-27.** With a game running,
  *"thank you very much"* still attaches a Nitra card and *"what time is it"* attaches three. Two of the six test phrases were fixed by the D28
  floor change; the other two come from the keyword half, and raising that floor pushes against D25. Confirmed on hardware, card for card.
  The residue is judged acceptable because the model mostly ignores an irrelevant card. Tables, method and the D28 numbers:
  [roadmap-details.md](roadmap-details.md#ordinary-phrases-attach-game-cards).

## User-adjustable spoiler fencing (absorbed into the tiered setting)

- ★★ **User-adjustable spoiler fencing** (hide by risk band)
  - **Goal:** Settings control for tap-to-reveal / fence masking by estimated risk band.
  - **Depends on:** spoiler confidence chip; shipped `strategy_spoiler_masking_enabled`.
  - **Related:** [spoiler-constitution.md](planning/spoiler-constitution.md).

## Spoiler coverage should be a setting with tiers

- ★★★ **Spoiler coverage should be a setting with tiers** — proposed by the maintainer on the corpus gap sheet, 2026-08-29:
  *"I think spoiler coverage should be matched to a future setting. On one setting, there's no spoiling of bosses/endings/chapters. On
  the another end it'll allow anything specifically asked by the user. On another it's anything past the intro/tutorial."* Today the fencing
  rule is fixed. **Half of it already ships:** their closing line — *"if the user asks about a boss or area specifically, they don't care
  about spoilers"* — is Phase 4's locked spoiler rule (stay unfenced when the user named the thing), so the instinct matches the code. What
  is new is wanting the rest exposed as a user choice. **Default if nothing is chosen, also from the sheet: fence only named story beats and
  endings.** Needs a Settings control (and therefore a focus-graph entry), a tier the spoiler service reads, and prompt wording per tier.
  [audit/corpus-gap-answers-2026-08-29.md](archive/corpus-gap-answers-2026-08-29.md) § 5.

## The corpus has no starting out card

- ★★★ **The corpus has no "starting out" card** — found 2026-08-29 by what the gap sheet's free-text answers asked for rather than by what it
  asked about. Every strategy card is about a *thing*: an enemy, an item, an area, a mechanic. The maintainer asked twice for **build and
  early-game guidance** ("pros and cons of different builds, make cards designed around early game, or even character design" — for both
  Cyberpunk 2077 and Fallout 4) and once for **an orientation card pitched at someone who knows a neighbouring game** ("explain this game to
  someone familiar to GTA but not RDR"). Neither shape fits the existing types cleanly. **Open question before any are written:** whether
  this is a new `section_type` (which is a schema and chip-wording change) or lives as `mechanic` with a naming convention. Not smuggled in
  under D39, which was only about four existing cards' kinds.

**Built 2026-09-26 (plan 70, helper E, commit `83cd1d78`).** Settled as its own `section_type`,
`starting_out`. A new player asking a game's suggestion chips now sees "How do I get started in
<game>?" for every title with one, and typing "where do I start" or "how do I get started" reaches
that game's own note the same way "the boss" already reaches a boss note. `scripts/build_rag_db.py`
now refuses to build the library if a note named "Starting out in ..." is not typed `starting_out`,
so a future note left mistyped is caught at build time. All 28 starting-out notes now carry the kind:
the 22 original rows re-typed, plus 6 new ones (Cyberpunk 2077, Fallout 4, Red Dead Redemption 2, and
one each for Brotato, Palworld, Skyrim). No corpus format change was needed for this part, since the
kind is free text.

## Eval fixture cannot see a recall failure

- ★★ **Eval fixture cannot see a recall failure** (paraphrase rows)
  - **Goal:** `kb_eval_v2` has **1** labeled case out of 138 where keyword search returns nothing, so the slice that proves the vector half adds recall is a sample of one. Measured 2026-08-18 by the re-aligned harness. Add paraphrase rows — questions that ask for a card without using its words — until that slice can gate a regression.
  - **Starting material:** the 15 paraphrased questions in [audit/rag-vector-recall-floor-2026-08-18.md](archive/rag-vector-recall-floor-2026-08-18.md) are already written, measured and labelled with the card each one should return. `tests/fixtures/kb_eval_paraphrase_v0.json` (15 rows) exists but the arms run does not read it.
  - **Needs a maintainer call first:** the v2 fixture is approved and the PR2 bake-off was measured against it — new rows change what the numbers mean, so decide whether they join v2, form a v3, or stay a separate reported slice.
  - **Largely overtaken by the blind holdout rows, pending one measurement.** The 15 paraphrase rows joined v2 as `V2-PARA-*` under **D23** (all `tune`), and 56 blind rows joined as `V2-BLIND-*` under **D37** (all `holdout`) — 20 on 2026-08-28 and 36 later the same day, 18 of the second batch written as pure paraphrases sharing no vocabulary with their card. The keyword-blind slice was **3** labeled rows when last measured on 2026-08-28, up from 1. **It has not been re-counted since the second batch**, deliberately — no measurement was run while those rows were written. Re-count it on the next arms run before deciding whether this item is closed.

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
    shared Deck tips, **Tip** badge on game chips only. The chip pool now draws **one kind at a time** rather than filling from the highest-priority kind first: the track 2 cards took Ocarina of Time to six boss cards and its whole pool became six *"How do I beat X?"*, with its items and enemies unreachable and six boss names offered in a carousel a player is only browsing. Enemy and item cards get their own wording (*"How do I deal with X?"*, *"How do I use X?"*). Costs nothing where a title's cards are lopsided — Left 4 Dead 2 files seventeen cards as `mechanic` and returns the same six chips, reordered. On-Deck **PHASE4-CHIPS-01** — **badge direction passed 2026-08-29**: the **Tip** badge lands on the game chip only, never on a shared compat chip or a static seed. **The clipping direction is blocked** by the vanishing-corpus-chip bug in Bugs above, which keeps 5 of the 6 game chips off the screen, so no long label ever renders to measure.
  - **Track 2 (shipped):** 16 structured cards for the two sample titles — 6 enemy, 6 item, 4 boss —
    authored with labelled lines (`Summary:` / `Weak points:` / `Uses:` / `Phases:` / `Tips:`), plus a
    conditional prompt clause that keeps those labels as light bullets in the reply. Corpus 117 → 133
    sections. Measured against the built corpus with the real embedding model: of 18 questions naming or
    describing a new card, **0 reached one before and 15 after** (16 once the type-recall preference was
    narrowed, below). The misses are pure paraphrases sharing no word with the card —
    `what do i do about the big one that tanks everything`, `something keeps grabbing me and sending me
    to the start`. No regression on the six questions that already worked.
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
flow R. See [Library format bump and per-game Deck tips](#library-format-bump-and-per-game-deck-tips).

**FAILED (Deck) 2026-09-26 (plan 70, flow R):** neither game tried reached its own tip. With Deep Rock
Galactic: Survivor running, "the text on screen looks blurry on my deck" got generic display-scaling
advice with no local match at all ("No close match in my notes"); reworded as a troubleshooting-shaped
question in Speed mode it read "Knowledge base (skipped)" and logged a flat "no_hit" for the game — the
game's own Render Scale tip (already sitting in the library) was never reached either way. With Fallout
4 running, "how do I get mods working, what launch options should I use" also missed the maintainer's own
F4SE tip, attaching an unrelated Stimpaks note instead and inventing generic launch options. The cause in
both cases: the question never gets sorted as troubleshooting in the first place, and the per-game tip
pull only runs for questions that do. Being fixed (helper E2) before the library is published — the
maintainer's call. The shared tip's source-page credit line still cannot be checked until a tip actually
shows. Evidence `docs/test-evidence/plan70-R-R4.json`, `plan70-R-R4-try2.json` (+ two screenshots).

**Fixed 2026-09-26 (helper E2, commit `e1bc0c16`).** A game's own Deck tip now reaches the answer
whenever a game carrying its own tip is running and the question matches that tip by keyword — no
longer only when the question was already sorted as troubleshooting. Measured against 114 real
strategy-mode questions for the four games that carry a tip: 0 wrong pick-ups, 0 notes lost, and the
matching floor (4.0) sits comfortably below the weakest real question (4.91) and above the worst
strategy row that should NOT match (3.34). Works in Speed mode and when Strategy mode had locked the
question to strategy notes instead. **Deck re-check owed, row R.4 re-check (E2's own text):** with Deep
Rock Galactic: Survivor running, ask "the text on screen looks blurry on my deck" in Strategy, then the
same question reworded in Speed — the Render Scale tip should appear first, with its source page, both
times; with Fallout 4 running, ask about mods and launch options in Speed — the F4SE tip should appear;
then, still on Deep Rock Galactic: Survivor, ask a real strategy question such as "how do I beat the
dreadnought" — the Render Scale tip must NOT appear, and the boss note should.

**Passed on the Deck 2026-09-26 (plan 70, flow L7), closed:** every step of that re-check passed —
Fallout 4 with the game named rather than running, since the question box was dead over the running
game. The library itself is still not published (the maintainer runs the push). Full readings in
[Flow L7 findings](#flow-l7-findings). Evidence `docs/test-evidence/plan70-R4-try3.json`,
`plan70-R4-try4.json`, `plan70-R4-try6.json`.

Moved here from the roadmap entry on 2026-10-02 (docs sweep, plan 79), to keep the roadmap under its size limit. Nothing was removed.

  Done). The chip labels fit on 2026-09-26. **2026-09-30 (plan 78 helper F, `092517c1`, `5e3e0f7e`):** the promise that one of the game's own chips always shows failed on the Deck 2026-09-26 (`docs/test-evidence/plan70-L6-PHASE4-CHIPS-01.json`). Cause: three of the four chip styles dealt the game's chips only once, and with one chip showing the promised chip sat in a spot that is off screen. Fixed, and the chip promise passed on the Deck 2026-10-01 (rows P78-TIP-CHIP and P78-CHIP-PACE; evidence `docs/test-evidence/plan78-P78-TIP-CHIP-try2.json`); the maintainer's own look at the pace is still owed, under the Verify entry "The game's own chip never came back, and the chips turned over too slowly".

## RAG Phase 7, Community tip contribution, RAG Phase 8

- ★★★★ **RAG Deck query — retrieval infra (Phase 7)**
  - **Goal:** Optional sqlite-vss/ANN, auto-pull nomic, RRF extensions, vision→KB, demote, packs, intent retrieval.
  - **Status:** FTS+vector shipped in remediation; the locked **meaning-fallback** track (vector list into RRF when FTS is empty/weak) shipped 2026-08-18 as the per-game recall pass — sqlite-vss/ANN is now an optimisation of a path that exists, not a prerequisite. Remainder docs only. [knowledge-base.md](knowledge-base.md) § Phase 7.
- ★★★★★ **Community tip contribution** (corpus inbound path)
  - **GitHub:** [bonsAI Issues](https://github.com/qd313/bonsAI/issues) — issue TBD.
  - **Goal:** Reply → **Suggest as a tip** writes schema-valid card to Desktop + GitHub attach URL.
  - **Depends on:** **RAG Phase 6** public publish — **shipped 2026-08-16, so this is unblocked** ([archive/roadmap-completed.md](archive/roadmap-completed.md)).
  - **Source:** [13-roadmap-feature-ideas.md](archive/13-roadmap-feature-ideas.md) § C2.
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
  that holds with a game running and not with nothing running. Next step: a floor under the tip search so it can say
  none fit, plus a "no tip for this" line. (D81, D85) Planned as wave three ([48](archive/48-kb-wave-three-session.md)).

**Related work landed 2026-09-26 (plan 70, helper C):** the tip cut-off and a false-positive word
match are now fixed (see [Tip cut-off fix](#tip-cut-off-fix), [Lan word-boundary fix](#lan-word-boundary-fix)),
and the "no tip for this" line has real numbers (see [No tip line numbers](#no-tip-line-numbers)), but
still cannot be made to appear — that is still waiting on the maintainer.

## Every question waits about a second while the note search loads

Filed 2026-09-07 as "the note search has got about thirty per cent slower since August"; narrowed 2026-09-12.

**The device readings.** The same three questions, on the Deck: 793 to 900 milliseconds in August, 1078 to 1094
one September evening, 1103 to 1230 the next. The explanation offered at the time — that only the first question
after a quiet spell is slow — does not hold there: three questions asked back to back came back within 16
milliseconds of each other, no faster on the third than the first. A real question measured on 7 September took
1067 milliseconds for the same step.

**What the build machine says the two states cost** (`runs/plan48-embed-eviction-pc.json`, 2026-09-12): searching
the notes costs **1336 milliseconds when the model has to be loaded** and **14 milliseconds when it is already
there**. The Deck's per-question number sits on top of the loading figure, not the resident one. So the Deck
behaves as though the model is loaded from scratch for every question.

**What the build machine could not reproduce, and why that is still useful.** The leading idea was that writing an
answer pushes the search model out of memory. On this PC it does not: after a reply, both models were still
resident and the next search took 24 milliseconds. But this PC has far more memory than a Deck, so the honest
reading is that it never gets low enough to push anything out — which is itself why repeat questions are fast here
and slow there. A negative result here does not clear the Deck.

**What would settle it**, and it is cheap: read what the Deck is holding in memory at three moments — before a
question, after the notes are searched, and after the answer finishes. If the search model is gone after the
answer, the cause is settled. Row **KB-SPEED-02**.

**Two things ruled out.** A fresh process is not the difference (two separate runs of the check both read fast).
And nothing in the plugin throws the search model away: the answering model is asked to stay in memory for five
minutes, and the search model gets Ollama's own five-minute default because the request says nothing
(`ollama_embed_service.py:137`).

**A related risk, not yet a bug.** The search gives up after three seconds and falls back to word matching only,
silently (`knowledge_base_service.py:1620-1624`). A load takes 1.34 seconds on a strong PC. Today's Deck readings
are well under three seconds, but not so far under that a busy moment could not cross it, and a person would get
worse answers with nothing on screen to say why.

## Searching the notes by meaning costs about a second, every time, on the Deck

- ★★★ `[KB]` **Searching the notes by meaning costs about a second, every time, on the Deck** — **ACCEPTED
  2026-09-06.** Repeated on the Deck: 1.10, 1.23 and 1.19 seconds across three questions in a row, the same band as
  the first time this was measured. The maintainer looked at the number and said that is fine — about a second before
  an answer that then takes tens of seconds to write out is not something a person would notice. **The one-second
  target this was measured against is retired.** The related finding still stands: a repeat search is fast on a
  PC (0.05 seconds) but not on the Deck, where the third question here was no faster than the first. **The cause
  is now measured** — the two models pushing each other out of memory, see the step above — and removing it reads
  as cheap; the acceptance above stands until the maintainer says otherwise. (D84) Evidence
  `docs/test-evidence/round34-drg-q*.json`, `docs/test-evidence/plan46-R2-strategy-half.json`.

*Moved out of the roadmap on 2026-09-21, superseded by the current summary there.*

## Wrong-subject notes

- ★★ `[KB]` **Four questions still get notes about the wrong subject** — **OPEN, three of the four now say so,
  found 2026-09-07.** Asking Black Mesa how to tame a horse, asking Portal 2 where to buy a house, and asking about
  a Hades boss that does not exist all still attach a note. The floor added this wave cannot catch these without
  also throwing away twenty or more correct answers elsewhere in the library, so it was left as it is. **Three of
  the four now carry the new "no close match" line** (D88 above), so the answer no longer reads as grounded — but
  the wrong note is still attached and still shapes the reply. *"Where do i buy a house"* gets no line at all,
  because a word in it really does point at a card. Fixing the attachment itself, rather than labelling it, is
  wave-four note-writing work. **Found again 2026-09-18:** a Hades "boss at the end of the first area" question
  attached "Temple of Styx" first and the reply answered about Theseus and Asterius instead of Megaera, steered
  by the top note (`docs/test-evidence/plan58p1-QA-NOTES-BLOCK-02.json`).

  **Sighting, 2026-09-26 (plan 70, flow L1):** Hades "who is the first boss" and "the boss at the end of
  Tartarus" both attached the same wrong note (Theseus and Asterius) and the reply talked about them,
  twice. Evidence `docs/test-evidence/plan70-SPOILER-COVER-01.json`.

**Checked 2026-09-26 (plan 70, flow L2): borderline, known fragile, not a regression.** After the "no
close match" wiring fix landed (`e4c24bdd`), the Black Mesa horse-taming control question — still a
wrong-subject question with nothing that matches — no longer showed the "no close match" line at all, on
screen or in the saved chat file. The model instead said in its own words that it had no information on
the subject, inside its own spoiler cover around otherwise harmless general mechanics. Evidence
`docs/test-evidence/plan70-NO-CLOSE-MATCH-HK-02.json`.

**Measured the same day with the real code and the current library, on the PC.** Once the game's own
name is removed from the question, none of "tame" or "horse" appears in any of the three attached notes
— the note-text fix changes nothing here either way. The line is decided by the older score that judges
closeness without the game's name, and that score landed at 0.6508 against the 0.65 cut-off: on the
edge, close enough that ordinary differences between the PC's and the Deck's own embedding numbers can
flip it. A measured cut-off is not retuned for one question; no code change made.

*Moved out of the roadmap on 2026-09-21, superseded by the current summary there.*

## The "no close match" line reads wrong next to a note the reply used

- ★★ `[KB]` **The "no close match" line reads wrong next to a note the reply used** — **OPEN, found 2026-09-18.**
  The line judges only the first attached note's scores, so on a Hollow Knight boss question it said the answer
  leaned on the model's own knowledge while the reply was actually built on the Broken Vessel note, attached
  second; on a Pikmin 2 question it said the same thing under a reply built on the very note the block showed.
  Either look at the best attached note, not just the first, or word the line as "a thin match" rather than a
  claim the notes were not used. Evidence `docs/test-evidence/plan58p1-M-hk-boss-before.json`,
  `docs/test-evidence/plan58p1-QA-NOTES-BLOCK-04.json`. **Sighting, 2026-09-19, Half-Life 2:** a question the
  notes genuinely do not cover got the warning line for the first time, but a note card naming three notes
  showed underneath it at the same time, contradicting the line. Evidence
  `docs/test-evidence/plan61-W2-R5-hl2-retry3.json`.

**Fixed 2026-09-26 (plan 70, helper B, commit `58f60c0a`).** The check now also reads each attached
note's own text, where the matching word usually lives, not just its title, plus a small tolerance for
plurals. A 104-question sweep after the fix: 1 answer changed, for the better. **Now wired into real
answers (commit `e4c24bdd`)**, tested through the real path: a Hollow Knight-shaped note stops showing
the line, and a note sharing no word still shows it. Row **KB-NOCLOSE-TEXT-01** passed on the Deck 2026-09-28 (plan 74), closed; evidence
`docs/test-evidence/plan74-KB-NOCLOSE-TEXT-01.json`.

*Moved out of the roadmap on 2026-09-21, superseded by the current summary there.*

## Five checks from the August retrieval rework were never run on the Deck

- ★ `[KB]` **Five checks from the August retrieval rework were never run on the Deck** — **VERIFY, or retire.** The corpus
  format gate, the relevance floor, follow-ups searching the user's words, transparency matching what the model got, and
  the Developer kill-switch. Either one evening with pinned test chips, or close them as superseded by the rows that
  passed this week. **Run 2026-09-15: the relevance-floor row is really two checks bundled as one, and they point
  opposite ways.** Its on-topic half is a real regression guard worth keeping. Its off-topic half — an unrelated
  question should attach nothing — fails as written, but that failure is the behaviour the maintainer already accepted
  on 2026-08-27 in the "Unrelated questions still get game cards stapled on" entry above; the row and that entry now
  contradict each other, which is for the maintainer to settle by retiring or rewording one of them. Rows
  **KB-VARIANT-01**, **KB-FLOOR-01**, **KB-FOLLOWUP-01**, **KB-TRANSPARENCY-01**, **KB-KILLSWITCH-01**.
  **Tried again 2026-09-18 with Hades and Half-Life 2 running: KB-FOLLOWUP-01 and KB-TRANSPARENCY-01 stayed
  blocked, and KB-FLOOR-01's already-passed on-topic half could not be freshly confirmed either** — every one
  of them needed a question sent, and the Ask-box freeze above (the three-star focus entry) stopped every
  question from going out. Evidence `docs/test-evidence/plan61-KB-FOLLOWUP-01.json`,
  `docs/test-evidence/plan61-KB-TRANSPARENCY-01-retry.json`, `docs/test-evidence/plan61-KB-FLOOR-01-ontopic.json`.
  **Tried again at 12:50: KB-TRANSPARENCY-01 and KB-FLOOR-01's on-topic half stayed blocked** — Half-Life 2
  had dropped off the Recent Games row so it could not be launched, and the pinned test sentences below would
  have stopped the question anyway. **KB-FOLLOWUP-01 and KB-KILLSWITCH-01's Show details half are now blocked
  by that new pinned-chip problem instead of the earlier freeze:** the Megaera question they both depend on
  could not be sent because the pinned test sentence stopped showing and no test sentence may be typed by
  thumb. Evidence `docs/test-evidence/plan61-KB-TRANSPARENCY-01-retry2.json`,
  `docs/test-evidence/plan61-KB-FLOOR-01-ontopic-retry2.json`, `docs/test-evidence/plan61-KB-FOLLOWUP-01-retry2.json`,
  `docs/test-evidence/plan61-KB-KILLSWITCH-01-retry2.json`. On 2026-09-19 the maintainer played Half-Life 2
  once more, so it is back on the Recent Games row and these rows can run in the next Deck block.
  **Run again 2026-09-19, this one still cannot close:** **KB-FLOOR-01's on-topic half passes** clean, a
  Half-Life 2 question attached the right note as it should. **KB-KILLSWITCH-01's Show details half now
  passes too** — with the meaning-search switch off, the screen correctly says it is using plain keyword
  search and the game still gets an answer with a note attached; the switch was turned back on and
  confirmed. **KB-FOLLOWUP-01 is a partial:** the follow-up search does find the right note again, but the
  written reply asks which boss is meant instead of using the name it found — the search half passes, the
  reply half does not. **KB-TRANSPARENCY-01 is blocked, not by the Deck this time but by the plugin itself:**
  its log never records which notes were searched or attached, so there is nothing written down to check the
  on-screen note list against. That gap needs either the plugin's own activity log switched on before a
  question is asked, or a line added to the log naming which notes were attached — without one of those,
  this check can never be run as written. **KB-VARIANT-01 is still blocked**, since running it would mean
  replacing the very library under test. So this entry stays open: three of the five checks have real
  answers now, one is blocked by a plugin gap rather than a Deck problem, and one still cannot be run at
  all. Evidence `docs/test-evidence/plan61-KB-FLOOR-01-ontopic-retry3.json`,
  `docs/test-evidence/plan61-KB-KILLSWITCH-01-retry3.json`, `docs/test-evidence/plan61-KB-FOLLOWUP-01-retry3.json`,
  `docs/test-evidence/plan61-KB-TRANSPARENCY-01-retry3.json`.

*Moved out of the roadmap on 2026-09-21, superseded by the current summary there.*

**Update 2026-09-22: four of the five now have real answers.** The transparency check joined them
that night, once the log finally named the attached notes. Only the corpus-format check still cannot
run, since that would mean replacing the library it tests. **Per D116 #7, the corpus-format check is
retired, covered by its own unit tests.** **The follow-up check passed in full on the Deck 2026-09-23:**
Megaera's note came first for both the parent question and its follow-up. The relevance floor stays
half passed — its on-topic half is a real pass, its off-topic half still waits on the maintainer to
retire or reword it against an earlier accepted decision.

## Hidden spoiler box stays shut on games with no Steam ID and on name-first questions

- ★★ `[KB]` **Hidden spoiler box stays shut on games with no Steam ID and on name-first questions** — **VERIFY,
  landed 2026-09-15, four commits, unit-tested.** A game known only by name now opens its box; naming the boss
  first opens it on screen, in copied text and in read-aloud; a no-story game named in the question gets the same
  relaxed prompt its risk chip already assumed. **STRAT-SPOIL-TEXT-01 passed on the Deck 2026-09-15, both halves.**
  **STRAT-SPOIL-FIRST-01 passed on the Deck 2026-09-18:** naming Wheatley up front in Portal 2 kept the whole
  answer in plain text from the first streamed word, with no hidden box, and it was still plain after closing
  and reopening the chat; the old "Portal 2 not in the library" note is settled — it was installed all along.
  Evidence `docs/test-evidence/plan61-STRAT-SPOIL-FIRST-01.json`. **STRAT-SPOIL-NAME-01 tried 2026-09-18,
  blocked:** Doom 64: Retribution is genuinely installed, but it is not on the Deck's Recent Games row, the
  only list the launch tool can search, so it could not be started; someone needs to play it once by hand
  first. Evidence `docs/test-evidence/plan61-STRAT-SPOIL-NAME-01.json`. From the older **STRAT-SPOIL-DRG-01**
  block: **DRG-01b tried 2026-09-18 with Deep Rock Galactic: Survivor running, blocked** by the same Ask-box
  freeze as the three-star focus entry above (evidence `docs/test-evidence/plan61-DRG-01b.json`); **DRG-01c
  not tried on purpose** (would mean removing the library, out of scope tonight). **HADES-UNNAMED-STREAM-01
  and HADES-UNNAMED-01 (a fourth try) were tried again 2026-09-18 with Hades running and both FAILED**, sent
  cleanly this time with no focus trap at all: the reply came back in plain text with no spoiler box at any
  point, either while streaming or once finished. Both rows now ride on the new three-star bug above (a
  name-withheld boss question comes back with no cover), not on the Ask-box freeze. Evidence
  `docs/test-evidence/plan61-HADES-UNNAMED-STREAM-01-retry2.json`,
  `docs/test-evidence/plan61-HADES-UNNAMED-01-retry2.json`. **Still owed tonight:** STRAT-SPOIL-NAME-01 (Doom
  64 cannot be launched), DRG-01b (stopped by the focus trap), DRG-01c (left out on purpose). On 2026-09-19
  the maintainer said Doom 64 is not readily available, so STRAT-SPOIL-NAME-01 stays blocked until it is.
  [Plan 54](archive/54-spoiler-rules-gaps.md). **DRG-01b tried again 2026-09-19, still blocked:** Deep Rock
  Galactic: Survivor had fallen off the Recent Games row again, so it could not be launched. Evidence
  `docs/test-evidence/plan61-DRG-01b-retry.json`.

*Moved out of the roadmap on 2026-09-21, superseded by the current summary there.*

**DRG-01b passed on the Deck 2026-09-23:** with Deep Rock Galactic: Survivor running, the knowledge
base off, masking on and no consent phrase, the boss tactics came back in plain text — no cover, no
notes block, no knowledge-base search in the log, and no question-box trap on the way to Ask.
Evidence `docs/test-evidence/plan64-DRG-01b.json`. STRAT-SPOIL-NAME-01 is still blocked, since Doom 64
cannot be launched.

## RAG Phase 8: catalog corpus

- ★★★★★★ `[KB]` **RAG Phase 8: catalog corpus** — **OPEN, intent only.** The change that makes most people's games get
  notes instead of the model's memory: about the top 1000 Steam titles, the top 100 on Deck, and an emulated slice. Months:
  it cannot be hand-written (161 cards took six weeks), so it needs an ingestion pipeline from wiki dumps, per-source
  licensing, a size budget, packs and the index. [knowledge-base.md](knowledge-base.md) § Phase 8. The first step is
  planned as [58 phase 1](archive/58-phase-1-notes-shown-and-wiki-extracts.md): a reader that takes a wiki's own
  sentences without rewriting them, ten games from sources already cleared, and a study of which sources cover many
  games under one licence. That [source study](archive/research/kb-catalog-sources-2026-09.md) landed 2026-09-17
  and recommends the Super Mario Wiki first, the per-wiki Fandom check second, and the walkthrough wiki third
  once its saved copy has been tried with the reader. The first ten games from those cleared sources landed
  2026-09-18, written from the wiki pages fetched that day, taking the library to 35 games; landing them
  reopened the July no-new-games lock, since the catalog phase starts here (D111).

*Moved out of the roadmap on 2026-09-21, superseded by the current summary there.*

## A suggestion chip pulled from the game's notes shows no Tip mark

- ★ `[chips]` `[KB]` **A suggestion chip pulled from the game's notes shows no Tip mark** — **OPEN, found
  2026-09-18 on the Deck with Half-Life 2 running.** The knowledge base was on, and the suggestion chip
  showed real tips straight from the game's own notes — but the small coloured dot that is supposed to mark
  a chip as coming from the notes never appeared, so a person looking at the chip has no way to tell it is
  a real tip and not a guess. The dot is only meant to light up when a chip is marked as coming from the
  notes; these chips did carry real note content but arrived without that mark, or lost it on the way to
  the chip, so the two checks that decide "is this a note chip" and "should the dot show" are not agreeing
  with each other. Row **CHIP-BUTTON-09**. Evidence `docs/test-evidence/plan61-CHIP-BUTTON-09.json` and its
  two screenshots.

*Moved out of the roadmap on 2026-09-21, superseded by the current summary there.*

## A follow-up still names the wrong boss one run in three

- ★★★ `[KB]` **A follow-up still names the wrong boss one run in three** — **OPEN, left behind when the follow-up
  fix closed 2026-09-12.** Ask about a boss, then *"what about its second phase"*, and you now get the right boss two
  times in three, where it used to be wrong every time. The remaining third still names the rival boss. DOOM Eternal
  is wrong every time, and no amount of work on the search can close that one. This is the half the shipped fix did
  not cover, kept visible on purpose rather than archived with it. [Numbers](archive/48-kb-wave-three-session.md).
  (D98) **Sighting, 2026-09-19, Hades:** a different shape of the same family — a follow-up question about a
  boss's second phase found the right boss's note again, but the written reply asked which boss was meant
  instead of using her name. Evidence `docs/test-evidence/plan61-KB-FOLLOWUP-01-retry3.json`.

*Moved out of the roadmap on 2026-09-21, superseded by the current summary there.*

**Measured 2026-09-26 (plan 70, helper K), three ways, by hand (24 second-question answers each, 8 games
× 3 runs):** today's shape scores right 4, wrong 4, asks "which boss?" 10, vague 6; dropping every other
attached note scores 11/0/8/5; sending the previous question and a short version of its answer scores
21/2/1/0 (fixes DOOM Eternal, about 0.6 s slower per follow-up on the PC). The first idea (carry the
subject into the instructions) was already shipped. The maintainer picked sending the previous question
and answer (D112, added 2026-09-26); being switched on now.

**Passed on the Deck 2026-09-26 (plan 70, flow L2), closed, row reworded to "stays on the right boss."**
Four tries, each a new chat: name a boss, then a bare follow-up about its second phase, reworded each
time. All four stayed on the boss already named — nobody was asked which one, nobody named a wrong one.
Two of the four said the boss's name outright (one of those inside a spoiler cover, correctly, since the
player had named her first); the other two only said "her"/"she," without naming anyone, which still
counts as staying right rather than going wrong. Side finding, not a bug: a Hollow Knight follow-up asked
about a second Hornet fight; the reply said the notes don't mention one, which is true — the game does
have a second Hornet fight, the notes just don't cover it. Evidence
`docs/test-evidence/plan70-FOLLOWUP-BOSS-01.json`.

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

## No tip line numbers

**Numbers in 2026-09-26 (plan 70).** Four cut-offs tried on the topic sorter's pull, measured on 35
tuning questions plus the eight wave-two device sentences, twelve junk phrases and the five hardest:
none made the line appear on any sentence; narrowing the pull changed nothing; removing it lost 6 right
tips (33 → 27 right, 1 → 7 wrong). Why: every hard sentence gets its tip from the plain word search, not
the topic sorter, so the line can only appear if the word search for tips gets its own cut-off — not
built this wave.

**Retired by the maintainer 2026-09-27 (D112 item 14; helper Q, `db4b3b4a`).** The line and its code were
removed; nothing a person sees changes, since it never appeared. "Not in my notes" and "No close match in my
notes" are unchanged, and the check that keeps "Not in my notes" off a tip-sheet turn stays, renamed. Two
finished one-off scripts in `scripts/archive/` still call the removed function; noted only.

## Tip cut-off fix

**Fixed 2026-09-26 (`27fd9aee`).** The tip cut-off's own note said it sat just above the worst junk
phrase's score, but it actually equalled that score, and the check only turns away scores below the
cut-off — so that exact phrase could still get a tip. The cut-off moved from 0.5044 to 0.5050, just
above it; the weakest right tip on the tuning rows scores 0.5804, so no right tip is lost. Proven by a
test that was broken on purpose, failed, then restored
(`test_compat_meaning_floor_rejects_a_score_at_the_old_junk_ceiling`).

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

## Lan word-boundary fix

**Fixed 2026-09-26 (`ab0a6e40`).** The network topic's "lan" rule matched inside longer words too, so a
question ending in a word like "land," "language" or "lane" could be sorted as a network problem — a
Paper Mario question ending "right before they land" was the one found. Test
`test_lan_does_not_match_inside_a_longer_word`.

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

## Library format bump and per-game Deck tips

**Built 2026-09-26 (plan 70, helper E).** `compat_patterns` gains an optional per-game column (schema
3 → 4); every installed library goes stale until it downloads the new one. Two safety nets ride with
the bump: `e43fc91d` compares a library manifest's own format number against what this copy of bonsAI
understands and refuses before a single byte downloads, with a plain message asking the person to
update the plugin, if the library is too new; and an old plugin's own download check never looks at
the format number and reads columns by name, so it degrades to the old behaviour instead of crashing.
Five tips ship keyed to one game rather than shared (`ff37ea26`): the maintainer's own Fallout 4
mod-launcher option and GTA San Andreas: The Definitive Edition's DirectX 12 option, exactly as given
from their own Deck, plus two more for Deep Rock Galactic: Survivor and Ocarina of Time, each labelled
"Researched, unconfirmed" since nobody has checked them on real hardware the way the first two are.
Once a game is resolved, its own tips now join the search pool ahead of an equally-good shared tip
(`bbad8e00`), reusing the same preferred-tip weight a routed topic already gets.

**Deck check, plan 70 flow R, 2026-09-26 (build `7379a043`), library `2026.09.26` installed locally
ahead of publishing.** Not published: the maintainer chose to fix the per-game tips first.

- **R.1, installing the library — PASS.** One press on the Developer tab's own install button, no game
  running: the Ollama tab read the new version at once, no errors in the plugin log. Side note, by
  design or not: the install landed on the internal drive rather than the SD card the old library lived
  on, and rewrote the location setting; the old copy stays on the card, unused. Evidence
  `docs/test-evidence/plan70-R-R1.json` (+ screenshot).
- **R.2, the new games and their notes, nothing running — PASS, 5 of 5.** A fresh question for each of
  Brotato, Palworld, Skyrim, Fallout 4 and Red Dead Redemption 2 attached the right note every time,
  each one credited to its real source page. Two small model slips, not note errors: Skyrim's answer
  reversed the order of an instruction the note states correctly, and a Red Dead answer said Dead Eye
  "refills ammo or tonics" when the note says it only refills from tonics. Evidence
  `docs/test-evidence/plan70-R-R2.json`.
- **R.3, the starting-out chip with a game running — PASS, second try.** The first try was blocked by
  Steam itself (a "logged in on another computer" dialog over Left 4 Dead 2, not the plugin's doing) and
  a rig limitation reading a non-Steam shortcut's tile; re-run once the Deck was set offline. With
  Brotato running, its own "How do I get started in Brotato?" chip showed within a second and the answer
  attached "Starting out in Brotato"; with the maintainer's own Palworld shortcut running, its chip
  showed within three seconds too, so the name match works for both a Steam game and a shortcut. The
  runbook's own route (press the chip, then Ask) hit the already-known chip-then-Ask trap, so the
  question was sent with the chip's exact words instead; the owner may prefer to call that half
  unclear rather than passed for that reason. Evidence `docs/test-evidence/plan70-R-R3.json`,
  `plan70-R-R3-try2.json` (+ three screenshots).
- **R.4, per-game Deck tips — FAIL.** See [RAG Phase 4](#rag-phase-4-extended-retrieval): neither Deep
  Rock Galactic: Survivor's Render Scale tip nor Fallout 4's F4SE launch-option tip ever reached an
  answer, because the questions never sorted as troubleshooting in the first place. GTA San Andreas: The
  Definitive Edition was not on the Deck's Recent Games shelf, so its own tip was not tried at all.
- **New bugs found along the way, being fixed:** a hidden stuck selection — walking up from the question
  box can land the D-pad ring on "Save chat to Desktop" while it is fully covered by the dock, dead to
  every press, seen three times (helper F2 fixing); the already-known chip-then-Ask trap reproduced
  again; the Context line briefly names the previous game for about a second after switching games, and
  briefly reads "no active game" for under a second right after reopening the panel; a rotating
  suggestion chip can take a press meant for a different chip than the one actually read; and the
  plugin's own log records nothing about which notes or tips a question chose, which makes a routing
  problem like this one hard to diagnose from the log alone. Evidence
  `docs/test-evidence/plan70-R-R3-try2.json` (the hidden ring and chip-trap screenshots).

**Found while landing E2's tip fix, fixed the same night by the session (`c1ca8b7d`).** A library built
before 2026-09-26 (schema format 3 — the one still on the download sites while the new one waits to
publish) has no per-game column at all; only the build script adds that column, the plugin itself never
adds it to an already-installed library. E2's own tip check ran on every single question regardless, so
against a format-3 library it failed outright and emptied that answer's notes completely — strategy
questions included, not just troubleshooting ones. Caught by three follow-up tests run against the
2026-09-18 library. Fixed by having the shared tip lookup return no tips, rather than fail, when the
column is missing; this also quietly covers the older troubleshooting path, which had the same weakness
whenever a troubleshooting question named a game. New test
`test_a_library_from_before_per_game_tips_still_attaches_strategy_notes` fails without the fix. No Deck
row needed — the Deck itself already carries the newer library, so this could only have bitten someone
on the still-published, older download.

**New bug, found by E2, not fixed: contractions split into a stray letter in keyword search.**
`_fts_match_query` (`py_modules/backend/services/knowledge_base_search.py`) splits words like "there's"
or "can't" so that a bare single letter ("s", "t") is left over and can match a card purely by
coincidence. This runs for every keyword search — notes and the whole tip sheet — except inside the new
per-game tip check, which E2 wrote to avoid it. Needs a measurement across the full question set before
it is touched, since fixing it may move many scores at once, for better or worse. **Fixed the same night
(helper O, `55719a6e`), measured first** — see [Flow L7 findings](#flow-l7-findings).

**Published by the maintainer 2026-09-27, about 00:03,** as the permission check required ("Corpus point
release 2026.09.26" on the Hugging Face dataset; the GitHub release's files updated too). Checked by the
session: both sites' manifests read version 2026.09.26, format 4, identical to the release build, and both
sites' library files match it byte for byte; the Hugging Face credits page matches too.

**R.5, the fresh download from the published site — passed on the Deck 2026-09-27 (flow L9).** The
meaning-search model was removed once and the library removed; the plugin's own Download fetched
2026.09.26 from Hugging Face; the offer "Also download the meaning-search model (about 270 MB)?" appeared,
and the model landed in about 10 seconds; Update did not ask again; the next question read "Retrieval:
Keyword + meaning". Row **KB-NOMIC-OFFER-01** passes. **Still owed:** row **KB-FORMAT-REFUSE-01** — no
library too new for this plugin exists yet to test the refusal with. Evidence `docs/test-evidence/plan70-R5.json`
(+ 2 screenshots).

## Black Mesa's electrified-water question

**Found 2026-09-19.** Asking how to cross the electrified water gave the right, specific answer, but
the two notes Show details named as used were general early-game notes about starting out and the
opening tram ride — neither one is the electrified-water note, which does exist in the library. **Asked
again 2026-09-22 with different wording** (a repeat is cached and proves nothing): this time the
electrified-water note itself came first, showing the right note CAN be found, not that the original
wording now finds it. Evidence `docs/test-evidence/plan61-W3-D-blackmesa.json`,
`docs/test-evidence/plan63-BLACKMESA-WATER-NOTES.json`. **Asked again 2026-09-23 with the exact original
words, better but not fixed:** the electrified-water note is now attached and the answer is built on it,
but the two generic notes are still attached too, still listed first, and the block header still names
"Starting out in Black Mesa" — the same ranking shape as the Hollow Knight "no close match" bug, where
the right note is found but ranks behind generic ones. Evidence
`docs/test-evidence/plan64-BLACKMESA-WATER.json`. **Asked again 2026-09-23 with Black Mesa running: no
change** — having the game running did not affect this bug either way. Evidence
`docs/test-evidence/plan64-BLACKMESA-WATER-running.json`.

**Measured 2026-09-26 (plan 70, helper B): ranking a "Starting out" note lower is not this wave's
fix.** It helped the search test but hurt the answer test (46 to 41 of 57 right note first), so it
stays off; it would not have cured this bug alone either, since a second generic note still ranks
ahead.

## KB transparency matches what the model got

**Ran for the first time and passed, 2026-09-22,** once the answer-lines lane added the missing log
line — recorded as impossible every earlier time. **All three attached names confirmed on the Deck
2026-09-23:** a Hollow Knight reply's open notes block named the same three notes, in the same order,
as the log's own search and attach lines. Evidence `docs/test-evidence/plan64-KB-TRANSPARENCY-names.json`.
**The game-running case passed too, 2026-09-23:** with Half-Life 2 running, the open block named
Ravenholm, Combine soldiers and Hunter-Chopper, exactly as the log did. Evidence
`docs/test-evidence/plan64-KB-TRANSPARENCY-running.json`. **Still owed:** a case where a note is dropped
for space. Tried with nothing running, then again 2026-09-23 with a game running and a troubleshooting
question meant to produce a large Proton log — still could not be reproduced: 3 notes searched, 3
attached, none dropped, with a roughly 16,000-character prompt. Evidence
`docs/test-evidence/plan64-KB-TRANSPARENCY-starved.json`, `docs/test-evidence/plan64-KB-TRANSPARENCY-starved-try2.json`.
**Sighting, 2026-09-23:** searching the notes by meaning took about 1,070 milliseconds with a game
running, against 22 to 60 milliseconds measured elsewhere with nothing running.

## Pull the embedding model as part of installing the library

**Built 2026-09-26 (plan 70, helper D).** A person who never pressed the pull button silently got word
search only, the weaker half. Now, right after a fresh install finishes with that model still missing, a
confirm box offers to download it once; Update never asks again.

## Flow L7 findings

Long version of the fixes closed and the problems found in plan 70's last Deck block, flow L7
(2026-09-26, 21:52 to 23:43), and the helpers' landings just before it. Moved here to keep the roadmap
under its size limit.

**A running game's own Deck tip now reaches the answer (helper E2, `e1bc0c16`) — passed on the Deck.**
With Deep Rock Galactic: Survivor running, "the text on the screen looks blurry on my deck" in Strategy
put the game's own Render Scale tip first, credited "steamcommunity.com", and the answer named Render
Scale; the same question reworded in Speed attached that one tip only; the control question "how do I
beat the dreadnought boss" attached the Dreadnought note and not the tip. Evidence
`docs/test-evidence/plan70-R4-try3.json` (+ two screenshots). Over Fallout 4 the question could not be
sent (the dead question box below), so it was asked with the game named and nothing running: in Speed
and in Strategy the F4SE tip came first and the answer gave exactly that one launch option. Evidence
`docs/test-evidence/plan70-R4-try4.json` (+ two screenshots). Deep Rock Galactic: Survivor named, nothing
running, "text" wording: the Render Scale tip first again. Evidence `docs/test-evidence/plan70-R4-try6.json`.

**One game's own tip no longer attaches to another game's question (helper P, `aeed48be`) — passed on
the Deck.** The general tip searches now keep shared tips and only the resolved game's own. Measured on
the PC over the 76 troubleshooting test questions: the right tip first 26 → 26, in the top three 35 → 36,
questions with another game's tip in the running 5 → 0. On the Deck, "fallout 4 text looks blurry, and
what launch options do i need" got the F4SE tip and a shared display tip, and Deep Rock Galactic:
Survivor's Render Scale tip did not attach. Evidence `docs/test-evidence/plan70-R4-try5.json` (+ screenshot).

**"No close match in my notes" no longer shows when the game's own tip answered (helper P, `fb805301`) —
passed on the Deck.** Before the fix, the Strategy blurry-text answer ended with that line though the
tip was used (`plan70-R4-try3.json`). After it, the same kind of answer ended without it and the plugin
log showed no error. Evidence `docs/test-evidence/plan70-R4-try6.json` (+ screenshot).

**A tip-answered question no longer sets what the chat is "about" (`9063bbfb`) — held on the Deck.** A
Strategy turn rerouted to the tips used to store the tip's topic ("display") as the chat's follow-up
subject, so the next bare follow-up searched for "display". The test was proven by breaking it. On the
Deck, the bare follow-up "what about the second one" after the Fallout 4 turn showed "display" nowhere,
and the answer asked which thing was meant. Evidence `docs/test-evidence/plan70-R4-try5.json`.

**A tip with a source page shows it in its credit line — reworded, then passed.** The old check asked for
a *shared* tip with a source page. It could never pass with this library: of 164 tips only 3 carry a
source page, and all 3 belong to one game (Deep Rock Galactic: Survivor's Render Scale tip and two
Ocarina of Time tips); the shared tips are the maintainer's own words and carry none. The credit line
itself works: Deep Rock Galactic: Survivor's tip read "steamcommunity.com · bonsAI-maintainer". So the
check now reads "a tip with a source page shows it in its credit line", and passes on that tip. Evidence
`docs/test-evidence/plan70-R4-try3.json`.

**Up from a chip no longer parks the ring on a hidden "Save chat to Desktop" (helper F2, `12ee3dfb`) —
passed on the Deck.** Three tries over Deep Rock Galactic: Survivor on an answered chat and one with
nothing running: each time Up from the chip landed on "Save chat to Desktop" with its words about 10 px
clear of the dock, and Up again moved on. The measurement F2 asked for: the chat pane is 677 px tall and
runs under the 165 px dock; it was already scrolled to its end every time (153.1 of 154), and "Save
chat" is its last row, so the row's bottom sits at the dock's top edge. Over a game the whole panel sits
40 px lower, every box together. A brand-new chat has no "Save chat" row, so Up lands on the chat row.
Three walks saved (`checks/plan70-HIDDEN-RING-recheck-*`). Evidence
`docs/test-evidence/plan70-HIDDEN-RING-recheck.json`.

**Contractions no longer leave a stray letter in keyword search (helper O, `55719a6e`) — measured on the
PC.** Only the ending after an apostrophe is dropped before splitting ("there's" becomes "there", "can't"
becomes "can"), so no single-letter search word is left and nothing new becomes a search word. On the
test questions against a clean library, keyword search alone: tuning questions unchanged (164 of 199
found, 129 first); held-back questions found unchanged (194 of 236), first 143 → 144; wrong answers
unchanged at 42. A first try that deleted every apostrophe was rejected: it turned "what's" into "whats"
and lost one held-back question. No Deck row needed.

**New, open: over Fallout 4 the question box goes dead with no chip pressed.** Every time the panel was
opened over Fallout 4 (4 opens over about 5 minutes), the ring sat in the question box: Down (5 presses
checked) and Right left it there while the page's own focus moved to the Ask or mode button; only Up
worked. Closing and reopening the panel did not clear it while the game ran; with nothing running the
same walk reached Ask at once, and over Deep Rock Galactic: Survivor it worked too. The same shape as the
chip-then-Ask trap, without any chip. Evidence `docs/test-evidence/plan70-R4-try3.json`,
`plan70-R4-try3-fo4-box-down-dead.png`.

**New, open: a chat opened with RB while a game runs is drawn as history, and Down dies on its question
line.** With Deep Rock Galactic: Survivor running, RB from an empty new chat to the answered Dreadnought
chat drew it without its Helpful row, "Save chat" row or chip; Down reached the question line and then
did nothing for six presses while the page's own focus moved to "Show reasoning". Closing and reopening
the panel drew the chat in full and cleared it. Evidence `docs/test-evidence/plan70-HIDDEN-RING-recheck.json`,
`plan70-HIDDEN-RING-recheck-stuck-question-row.png`.

**New, open: a game's own tip is labelled "shared".** Show details credits Deep Rock Galactic: Survivor's
Render Scale tip and Fallout 4's F4SE tip as "Shared troubleshooting — <topic>", and since `9063bbfb` the
notes block over a game's own tip reads "From the shared Deck tips". Both should say it is that game's own
tip. The label comes from one fixed wording applied to every tip where tips are turned into cards
(`knowledge_base_cards.py`, `_compat_row_to_card`); fixing it means carrying the tip's game through several
card builders, and tests pin the exact wording of the sources list. Evidence
`docs/test-evidence/plan70-R4-try5.json`, `plan70-R4-try6.json`.

**New, open: a game's own tip is found only by its own words.** "The words on screen look blurry" in Deep
Rock Galactic: Survivor attached no tip — its keyword score was 2.0 against the 4.0 cut-off — while "the
text ... looks blurry" scores 6.9 and finds it. A question that avoids the tip's own words misses it; a
rescue by meaning search was measured and left for a later lane. Evidence `docs/test-evidence/plan70-R4-try5.json`.

**New sightings, open:** after a bare follow-up the suggestion chip read "Enable local knowledge base for
better game tips" though the knowledge base was on (once); the plugin log warned twice that a Strategy
answer's follow-up choices were not understood, so no choice menu showed (both on troubleshooting turns).
Evidence `docs/test-evidence/plan70-R4-try5.json`. And an answer that used the Render Scale tip said text
blurs when Render Scale is "too high", then said to raise it — the tip says plainly to raise it; the small
model garbled a clear tip (logged under "Deeper answer checks"). Evidence `docs/test-evidence/plan70-R4-try6.json`.

**Not run, owed:** R.5, a fresh download of the library from the published sites plus the
meaning-search model's offer. The library passes its release check and the Deck's copy matches the
release build byte for byte, but Claude Code's permission check refused the push to the public sites,
so it is not published. The maintainer runs
`python scripts/publish_corpus.py --build-dir build/kb-release --hf-clone-dir ../bonsai-knowledge-base --push-hf --push-github`;
R.5 follows. No released plugin can download a library yet (0.4.9 and main have no knowledge base).
