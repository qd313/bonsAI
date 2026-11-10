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
- [RAG Phase 7, Community tip contribution, RAG Phase 8](#rag-phase-7-community-tip-contribution-rag-phase-8)
- [A troubleshooting question mostly never reaches the tips](#a-troubleshooting-question-mostly-never-reaches-the-tips)
- [Hidden spoiler box stays shut on games with no Steam ID and on name-first questions](#hidden-spoiler-box-stays-shut-on-games-with-no-steam-id-and-on-name-first-questions)
- [RAG Phase 8: catalog corpus](#rag-phase-8-catalog-corpus)
- [Measure how well the AI reads a screenshot](#measure-how-well-the-ai-reads-a-screenshot)
- [Blind questions done](#blind-questions-done)
- [Speed mode tip gap](#speed-mode-tip-gap)
- [Three new games and their notes](#three-new-games-and-their-notes)
- [KB transparency matches what the model got](#kb-transparency-matches-what-the-model-got)
- [The note's own words under the reply](#the-notes-own-words-under-the-reply)
- [Plan 102 notes moved from the shelved roadmap (2026-11-02)](#plan-102-notes-moved-from-the-shelved-roadmap-2026-11-02)
- [Plan 102 notes moved from the knowledge-base roadmap (2026-11-03)](#plan-102-notes-moved-from-the-knowledge-base-roadmap-2026-11-03)
- [Plan 102 notes moved from the shelved roadmap (2026-11-03)](#plan-102-notes-moved-from-the-shelved-roadmap-2026-11-03)
- [Plan 103 notes moved from the knowledge-base roadmap (2026-11-09)](#plan-103-notes-moved-from-the-knowledge-base-roadmap-2026-11-09)
- [Plan 103 sweep K1 notes moved from the knowledge base roadmap (2026-11-09)](#plan-103-sweep-k1-notes-moved-from-the-knowledge-base-roadmap-2026-11-09)
- [Plan 103 sweep K2 notes moved from the knowledge base roadmap (2026-11-10)](#plan-103-sweep-k2-notes-moved-from-the-knowledge-base-roadmap-2026-11-10)
- [Plan 103 sweep K3 notes moved from the knowledge base roadmap (2026-11-10)](#plan-103-sweep-k3-notes-moved-from-the-knowledge-base-roadmap-2026-11-10)
- [Plan 103 end audit K9 notes moved from the knowledge base roadmap (2026-11-10)](#plan-103-end-audit-k9-notes-moved-from-the-knowledge-base-roadmap-2026-11-10)
- [Plan 103 sweep K10 notes moved from the knowledge-base roadmap (2026-11-10)](#plan-103-sweep-k10-notes-moved-from-the-knowledge-base-roadmap-2026-11-10)
- [Plan 103 sweep K11 notes moved from the knowledge-base roadmap (2026-11-10)](#plan-103-sweep-k11-notes-moved-from-the-knowledge-base-roadmap-2026-11-10)
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

## KB transparency matches what the model got

Passed on the Deck 2026-09-22 and 2026-09-23. Evidence `workshop:test-evidence/plan64-KB-TRANSPARENCY-names.json`. The full readings are in the trimmed archive.

**Sighting, 2026-09-23:** searching the notes by meaning took about 1,070 milliseconds with a game
running, against 22 to 60 milliseconds measured elsewhere with nothing running.

## The note's own words under the reply

Older notes, word for word (moved here 2026-10-14, plan 93 docs sweep).

  rows passed on the Deck and are closed: 01, 02, 03, 05, 06 and TEN-GAMES-01; 04's "no block" half passed 2026-10-03
  (`workshop:test-evidence/plan81-NOTES-BLOCK-04.json`). **Still owed:** 04's covered-game-running half (2026-10-03: the Black Mesa horse question showed the "No close match" line with no notes listed, `workshop:test-evidence/plan81-P81-KB-NOTES-FIRST.json`, but with no game running; 2026-10-08, game running: UNCLEAR, both tries attached notes (1042 and 1242 characters), so a reply with nothing attached never came up, `workshop:test-evidence/plan83-NOTES-BLOCK-04-game.json`), NOTES-BLOCK-07 (needs a person
  listening to confirm the block is never read aloud) and NOTES-BLOCK-LADDER (no block has had a chip ladder to test;
  retiring that half is the maintainer's call). Rows in [testing-manual.md](testing-manual.md). **2026-10-10 (plan 87 K1):** a fix for the "No close match" line appearing beside a notes block landed; 04's covered-game-running half and new row P87-K1-LINE-AND-BLOCK stay owed on the Deck. **2026-10-10 (plan 87 Deck blocks 5 and 5b):** row P87-K1-LINE-AND-BLOCK passed for 2 of its 3 asks (the notes block with no "No close match" line; `workshop:test-evidence/plan87-P87-K1-LINE-AND-BLOCK.json`, `plan87-P87-K1-LINE-AND-BLOCK-try2.json`); NOTES-BLOCK-04's own covered-game-running half is not marked closed by that result and stays owed.

**Moved from the roadmap 2026-10-22 (plan 97 docs sweep 3), word for word:**

  **2026-10-14 (plan 93 Deck block D3, Strategy mode, game running, two questions):** the line half is UNCLEAR. A made-up boss ("Who is the final boss called Zorblax") showed the "No close match" line and no notes block: PASS. "How do I buy a house in this game" drew a "From the notes" block and no line: FAIL, the known wrong-subject-notes entry above. Evidence `workshop:test-evidence/plan93-NOTES-BLOCK-04-game-strategy-D3.json`.
  **2026-10-14 (plan 93 Deck block C part 2, Deep Rock Galactic: Survivor running, Speed mode, two questions):** no notes block under either answer (the block half passes). The "Not in my notes" line did not show under either; the back end logged "no footer line added". That line shows only in Strategy and Expert by design (`py_modules/backend/knowledge/kb_not_in_notes_notice.py`), so the line half is still owed in Strategy or Expert. The evidence file marks the line half FAIL and only names Speed as a possible cause. Evidence `workshop:test-evidence/plan93-NOTES-BLOCK-04-game.json`.


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

## Plan 103 sweep K2 notes moved from the knowledge base roadmap (2026-11-10)

Written by the plan 103 bookkeeper sweep K2 after the second landing chain (notes for ten more games, the versus notes, the answer screen's D-pad fixes) and Deck block D0b. Older text is moved word for word, each piece headed by where it stood; the findings the helpers left are at the end.

**Entries and sentences as they stood before this sweep:**

**Where things stand, the first paragraph (as it stood before sweep K2):**

**Where things stand (2026-11-09).** The library people can download is 2026.10.25: 38 games, 414 notes, 164 Deck tips
and 351 tap-to-define words; the maintainer published it on 2026-10-25 and both channels were read back byte for byte
([the releases table](knowledge-base.md)). The build on this PC is bigger: version 2026.11.04, **583 notes and 167 tips** (plan 103's 18 mod tips, ids 168 to 185, are in the source and not yet in a build), every note with its meaning vector (`corpus.db` 4,096,000 bytes). It is not published yet (checked 2026-11-09): the maintainer's publish is owed, and GitHub's copy is still dated 2026-10-25. Every one of the 38 games has an enemy or item note; 15 have them in the labelled short-line shape.  The Deck's own copy is
2026.10.25 (`workshop:test-evidence/plan98-P98-KS-LIBRARY.json`).

**Bugs: older notes the wiki contradicts, as it stood:**

- ★ `[KB]` **Older notes the wiki contradicts, found by the plan 103 note writers** — **OPEN, found 2026-11-09 (plan 103 lane M takes them).**
  Writing the new notes, the helpers found small places where older notes and their wikis disagree: the Left 4 Dead 2 Charger note says only explosives stumble him, but the wiki says the grenade launcher does not; and older notes for Mario Party, Mario Party 2, 6 and 7, Super Smash Bros., Cyberpunk 2077 and Grand Theft Auto III differ in smaller ways. The list, game by game: [Detail](roadmap-kb-details.md#plan-103-sweep-k1-notes-moved-from-the-knowledge-base-roadmap-2026-11-09).

**Bugs: page out of focus, Down from the notes block, as it stood:**

- ★★ `[KB]` `[focus]` **With the panel's page out of focus, Down from the notes block skips the open details panel and lands on the suggestion chips** — **OPEN, found 2026-11-02 (plan 102 lane C, in the test setup; not yet seen on the Deck).**
  After lane C's fix (`1d262a94`, `8ce44695`) Down no longer dies there: the press moves. But the details tabs row and the chip grid have no Steam nodes of their own (plan 97 gave the notes block that), so the ring jumps past the open details panel, a moving press and not yet the stop a person expects. Row P102-UNDO-FOCUS-01 (UNCLEAR on 2026-11-03: the window's focus read true, so the lost-focus state never happened) would read it; on 2026-11-09 the page again kept the window's focus six times of six, so it was not read (`workshop:test-evidence/plan103-P102-UNDO-FOCUS-01-try2.json`).

**Bugs: Up from a checklist's step 1, as it stood:**

- ★★ `[KB]` `[ui]` **Up from a checklist's step 1 lands on the Copy reply text icon, and Down from that icon skips the whole step list and lands on Mark reply helpful** — **OPEN, found 2026-11-03 (plan 102 Deck block R0).**
  Down from the answer reaches step 1 and the steps walk as they should; the skip is on the way back. Evidence `workshop:test-evidence/plan102-P98-ROUTE-01-try3.json`.

**Bugs: crowding entry, the cause and final-library paragraphs, as they stood:**

  **One real cause in the search:** after the 51 notes the word search returns up to ten notes instead of three, which pushes a note found only by meaning down the blend; four of the five lost slots are worse for a player. **Code reading 2026-11-09:** nothing caps the word list near ten (it can run to 30); a note the word search missed is given a place one past the end of that list, so its credit shrinks as the list grows.
  **Final library, 2026-11-03 (lane X2):** one older right note slipped out of the first three (Mario Kart 64), the same cause: [Detail](roadmap-kb-details.md#plan-103-notes-moved-from-the-knowledge-base-roadmap-2026-11-09). Older text: [Detail](roadmap-kb-details.md#plan-102-notes-moved-from-the-knowledge-base-roadmap-2026-11-03)

**Next: KB online / versus, the entry as it stood:**

- ★★★★ `[KB]` **KB online / versus strategy content** — **OPEN, discovery locked 2026-08-09.** Multiplayer questions
  (roles, callouts, co-op) get nothing specific today. Plan: new card kinds, Left 4 Dead 2 first, then Counter-Strike 2,
  from archive dumps only. Two to three weeks. **Found 2026-11-09:** some of the August plan's file paths are stale (the spoiler-risk file moved to the spoilers folder); the seven "Playing as" notes it planned already exist under another kind (game mechanic); eight of eighteen versus test questions have no note to find. Plan 103 lanes V1, V2 and Q6 build its first three steps for Left 4 Dead 2; Counter-Strike 2 stays out. **Step one landed 2026-11-09 (lane V1):** five note kinds (versus, coop, callout, survival, realism) count as low spoiler risk and have their own chip wording; `docs/knowledge-base.md` lists every note kind; plan 17's file is corrected. The notes themselves (lane V2) are not written yet; row P103-VERSUS-01 is owed once they land. [Plan](planning/17-kb-online-versus-strategy-content.md) ·
  [Detail](roadmap-kb-details.md#kb-online--versus-strategy-content-and-rag-phase-5)

**Next: RAG Phase 5, the entry as it stood:**

- ★★★★ `[KB]` **RAG Phase 5: depth on the thirteen titles** — **PARTIAL.** The thirteen original titles went from 133 to 164 notes; plan 100 and plan 102 added 51 and 118 notes ([Detail](roadmap-kb-details.md#plan-103-notes-moved-from-the-knowledge-base-roadmap-2026-11-09)). Games with those notes in the labelled shape: 15 of 38 (7 before).
  **Measured, final library 2026-11-03:** 230 of the 236 blind questions for plan 102's eight games find their note in the first three; older results and the report: [Detail](roadmap-kb-details.md#plan-103-notes-moved-from-the-knowledge-base-roadmap-2026-11-09).
  **Plan 103 notes (2026-11-09):** ten games' notes are written, checked and landing (14 or 15 each); two more (Melee, Grand Theft Auto III) are checked and wait for the licence read. **No notes for Hades** (its wiki's licence cannot be used). Not written yet: Half-Life 2 (its wiki was read-only all evening) and nine more games. The crowding fix was turned down on its numbers (Bugs), which meets that part of Phase 5's finish. More: [Detail](roadmap-kb-details.md#plan-103-sweep-k1-notes-moved-from-the-knowledge-base-roadmap-2026-11-09).
  Two small things the lanes left open for you are in [Detail](roadmap-kb-details.md#plan-102-notes-moved-from-the-knowledge-base-roadmap-2026-11-03). [Plan](planning/28-phase5-corpus-depth.md) · [Detail](archive/roadmap-trimmed-2026-10-roadmap-kb-details.md#plan-100-notes-moved-from-the-knowledge-base-roadmap-2026-10-25)

**Next: Phase 8, the as-of sentence:**

**As of 2026-11-09:** the build on this PC has 38 games and 583 notes.

**Calls: the ten-note samples line, as it stood after the first K2 edit:**

  Ten random notes each: `workshop:checks/plan103-sample-earlier.md` (ten of the 169 notes plans 100 and 102 added), `workshop:checks/plan103-sample-B.md` (the first four games' notes below) and `workshop:checks/plan103-sample-C.md` (the eight party, fighting and Grand Theft Auto III files). Sample B was drawn before three small last fixes; it is refreshed before you read it. Batches D, E and F, drawn after those notes landed: `workshop:checks/plan103-sample-D.md` (Yoshi's Story, Diddy Kong Racing, Left 4 Dead 2 versus), `plan103-sample-E.md` (Fallout: New Vegas, Brotato, Skyrim) and `plan103-sample-F.md` (Palworld, Hollow Knight, DOOM Eternal). Batches for any later games are added here when their file exists.

**Next: screenshot measurement, the second set, long form:**

`tests/fixtures/screenshot_eval_v1.json` holds 29 pictures from 11 games, but only 1 with an enemy (a guess), no boss fight and 4 whose subject has a note; the target was 40 with ten bosses, and the Deck held only six game folders. 

**Deck check owed: hidden-box entry, the still-owed sentence, long form:**

 the rig can now launch a shortcut by its title (Deck tools 0.3.12), so the row no longer needs the maintainer's hand launch; plan 103 block D0a tried it on 2026-11-09 and the row is **UNCLEAR, not a pass**: Doom 64: Retribution launched by its title on the first call, but two boss questions got general answers with no spoiler box, so there was nothing to open

**Deck check owed: thumbs-down entry, second-night wording:**

the page kept the window's focus six times of six, so the four Down presses were not run

**Next: mod knowledge, the landed sentence, long form:**

(lane T3; no note uses it yet) and the first step, 18 basics tips (lane G1, above under Deck check owed); the device side stays plan 101's. One correction is owed to plan 101 (SMAPI's log folder): [Detail](roadmap-kb-details.md#plan-103-sweep-k1-notes-moved-from-the-knowledge-base-roadmap-2026-11-09).

**Next: RAG Phase 5, the list of the twenty games:**

 (14 or 15 each, 308 notes, counted from the files), each read by a checker and a licence reviewer and then fixed: Left 4 Dead 2, Fallout 4, Red Dead Redemption 2, Cyberpunk 2077, Mario Party, 2, 3, 6 and 7, Super Smash Bros., Melee, Grand Theft Auto III, Yoshi's Story, Diddy Kong Racing, Fallout: New Vegas, Brotato, Palworld, Skyrim Special Edition, Hollow Knight and DOOM Eternal.

**Deck check owed: screenshot-name entry, the PC numbers sentence:**

 The PC numbers (the game named 91 and 92 times in a hundred, up from 67 and 70) and the first try (2026-11-03: nothing attached, nothing tested): [Detail](roadmap-kb-details.md#plan-103-sweep-k1-notes-moved-from-the-knowledge-base-roadmap-2026-11-09). Still owed.

**Deck check owed: Brotato entry, the block D0b reading in full:**

 **Deck 2026-11-09 (block D0b, old build):** Brotato with nothing running drew its whole answer behind a shut cover on Default, with no no-story line in the log (`workshop:test-evidence/plan103-P103-M-BROTATO.json`); the new build must show it open.

**Deck check owed: covered-notes entry, the block D0b reading in full:**

**Deck 2026-11-09 (block D0b, old build, `workshop:test-evidence/plan103-P103-M-COVERED-NOTES.json`):** a whole-cover answer (Paper Mario, Doopliss) drew no notes line before or after the cover was opened; a part-covered one (Grand Theft Auto IV) drew none before and one after. 

**Next: RAG Phase 5, the own-words paragraph:**

  **House "own words" pass:** the licence reviewer found nothing that broke a wiki's licence but many lines too close to the wiki's sentences, and in the Melee file Nintendo's trophy text copied in nine notes; eight files (Mario Party, 2, 3, 6, 7, Super Smash Bros., Melee, Grand Theft Auto III) were rewritten, no fact changed, no note renamed. The lesson is in the lessons file.

**Next: KB online / versus, steps one and two in full:**

**Step one (lane V1):** five note kinds (versus, coop, callout, survival, realism) count as low spoiler risk and have their own chip wording. **Step two (lane V2):** 15 notes in the versus file (ten versus, three callout, one survival, one realism) and the seven "Playing as the ..." notes re-filed as versus; no finale content (checked twice).

**Bugs: crowding entry, lane R1 paragraph in full:**

the plain version failed one of decision D82's three protected tests; the narrow version passes them and gains 8 held-back questions with none lost in the search test, but with the game's name typed two questions lose their right note, which breaks the rule that nothing may be lost. The trade (about nine questions gained for two lost when the name is typed) is the maintainer's call. Record, patches and the names of the two questions:

**Where things stand: the answer-test paragraph, one sentence in full:**

 Every older answer-quality figure (plan 102's facts kept 68.9 in a hundred, the story-cover 11 of 15) must not be compared with new ones.

**Where things stand: the test-tooling line, as it stood:**

Test tooling since 2026-11-09 (questions in many files, the saved library noticing notes files, two one-call Deck scripts): [Detail](roadmap-kb-details.md#plan-103-sweep-k1-notes-moved-from-the-knowledge-base-roadmap-2026-11-09).

**Next: RAG Phase 5, the blind questions paragraph, as I first wrote it:**

  **Blind questions:** 294 rows in ten new files under `tests/fixtures/kb_eval/` (Left 4 Dead 2, Fallout 4, Red Dead Redemption 2, Cyberpunk 2077, Mario Party, 2, 3, 6 and 7, Super Smash Bros.), counted from the files. **Still to write:** questions for the last ten games, the versus notes and the mod tips. The crowding fix was turned down on its numbers (Bugs). Older text: [Detail](roadmap-kb-details.md#plan-103-sweep-k2-notes-moved-from-the-knowledge-base-roadmap-2026-11-10) · [Plan](planning/28-phase5-corpus-depth.md)

**Deck check owed: covered-notes entry, the Fallout 4 sentence:**

 The Fallout 4 computer-terminal sighting (`plan102-P102-FINDPC-01.json`) is a weak-match case, not a covered one.

**Deck check owed: Baldur's Gate 3 entry, the note names:**

: Owlbear, Githyanki Warriors, Minthara, Goblin Horde, Explosive Barrel, Potions, Weapon Poison.

**Deck check owed: mod tips entry, the Proton catch:**

 The licence read found nothing that blocks. One catch: the new tips had moved an old Proton crash tip out of first place in Speed mode; the landing's tests found it and rewording one tip fixed it.

**Next: honest-answer entry, the measuring sentence:**

three wordings, two runs each, are measured on this PC before it is switched on (row P103-HONEST-01 is owed only if it is).

**Next: honest-answer entry, the heading's tail:**

; built, off, measuring.**

**Where things stand: the build sentence:**

, every note with its meaning vector (`corpus.db` 4,096,000 bytes)

**Notes landed by plan 103 since sweep K1, by game (numbers counted from the files on 2026-11-10; 14 or 15 notes each):** Grand Theft Auto III 3500 to 3514, Super Smash Bros. Melee 3400 to 3414, Yoshi's Story 3600 to 3614, Diddy Kong Racing 3700 to 3713, Fallout: New Vegas 3800 to 3813, Brotato 3900 to 3914, Palworld 4000 to 4013, Skyrim Special Edition 4100 to 4113, Hollow Knight 4200 to 4214, DOOM Eternal 4400 to 4414. Left 4 Dead 2 versus 4500 to 4514 (ten versus, three callout, one survival, one realism). Each was read by a checker and a licence reviewer and then fixed. The ten earlier games (Left 4 Dead 2, Fallout 4, Red Dead Redemption 2, Cyberpunk 2077, Mario Party, 2, 3, 6 and 7, Super Smash Bros.) landed before sweep K1. Ten-note samples: `workshop:checks/plan103-sample-earlier.md` (the twelve earlier files, 169 notes), `-B.md` (Left 4 Dead 2, Fallout 4, Red Dead Redemption 2, Cyberpunk 2077; 58 notes), `-C.md` (the eight party, fighting and Grand Theft Auto III files; 119 notes), `-D.md` (Yoshi's Story, Diddy Kong Racing, Left 4 Dead 2 versus; 44 notes), `-E.md` (Fallout: New Vegas, Brotato, Skyrim; 43 notes), `-F.md` (Palworld, Hollow Knight, DOOM Eternal; 44 notes).

**A lesson from the house "own words" pass (also in the lessons file):** the licence reviewer found nothing that broke a wiki's licence but many lines too close to the wiki's sentences, and in the Melee file Nintendo's trophy text copied in nine notes; all rewritten, no fact changed, no note renamed. A wiki's licence does not cover game text the wiki quotes. Two synonym passes on the DOOM Eternal file did not pass a second read; a rewrite from a fact list did.

**Older notes the wiki contradicts, found by lane M's wave on 2026-11-10 (none fixed yet; the first list is in the sweep K1 section above):** Diddy Kong Racing: the amulet piece comes after the second boss race, not the first; the last world opens on four trophies of any medal, with every Golden Balloon and the T.T. amulet also needed for the last fight; T.T. needs a good time to bring out his ghost first; the zipper boost is "slightly faster". Yoshi's Story: a one-heart figure no page gives; the Lucky Fruit roulette; eggs at the ceiling spikes can hurt Baby Bowser; "the game decides which page unlocks". Left 4 Dead 2: the Charger note lacks the grenade launcher exception; the Smoker's tongue does 5 a second when constricting in versus; the Molotov note's 75 to 85 seconds against the Tank page. Hollow Knight: seed note 272 sends the Crossroads tram to the City of Tears, where the page says the Resting Grounds. Fallout: New Vegas: seed note 224 says a doctor's bag fully mends one limb. Palworld: seed note 420 says Predator Pals spawn at random, and a Raid Boss can be fought in a Raid Area.

**Left 4 Dead 2 versus notes (plan 103 lane V2):** no finale content (checked twice). Cost, measured: of the 18 labelled Left 4 Dead 2 search questions, 9 find their note in first place (11 before these notes) and 17 in the first three (unchanged). The Survival note mentions the Tank less, so a Tank question still finds the Tank note.

**No notes this session (2026-11-10):** Hades (its wiki is CC BY-NC-SA and Wikipedia has too little); Half-Life 2 and Black Mesa (combineoverwiki.net answered "Database is read-only" on every read on 2026-11-09 and again on 2026-11-10, three tries each night).

**Deck block D0b, 2026-11-09 21:14 to 21:42 EST, the old build (dist `9bc29b3c0500`; handover `workshop:planning/assets/103-handover-D0b.md`):** the readings are in the testing rows (P103-M-COVERED-NOTES, -BROTATO, -CHECKLIST, -DETAILS-STRIP, -SUMUP, -TAB-SECTIONS). The strip: what decided whether Down from "Hide details" lands on the strip was whether the newest answer had a notes line above it (with none, the strip; with one, the notes line first and the strip on a second Down); chat size and a running game did not decide it by themselves, but the two were mixed in these 15 tries and were not separated.

## Plan 103 sweep K3 notes moved from the knowledge base roadmap (2026-11-10)

Written by the plan 103 bookkeeper sweep K3, after the third landing chain (the chips ordered by the last question, the picture's own guess, the last ten games' blind questions, the mod-tip questions, the corrections to older notes) and the middle measurement. Older text is moved word for word, each piece headed by where it stood; the findings the helpers left are at the end.

**Entries and sentences as they stood before this sweep:**

**Where things stand: the answer-test paragraph, as it stood before sweep K3:**

**The answer test was repaired on 2026-11-09 (plan 103):** its three tries used to be follow-ups of each other and sent no seed, so they were not three separate tries (the plugin has no answer cache). Older answer-quality figures must not be compared with new ones. **New baseline, two runs:** facts kept 73.4 and 71.8 in a hundred (two points either way is noise); story cover 39 of 45. Older figures: [Detail](roadmap-kb-details.md#plan-103-notes-moved-from-the-knowledge-base-roadmap-2026-11-09)

**Bugs: older notes the wiki contradicts, the entry's body as it stood before sweep K3:**

  The writers found small places where older notes and their wikis disagree: Left 4 Dead 2 (the Charger note leaves out the grenade launcher), Mario Party, Mario Party 2, 6 and 7, Super Smash Bros., Cyberpunk 2077 and Grand Theft Auto III, and on 2026-11-10 Diddy Kong Racing, Yoshi's Story, Hollow Knight, Fallout: New Vegas and Palworld. The list, game by game: [Detail](roadmap-kb-details.md#plan-103-sweep-k2-notes-moved-from-the-knowledge-base-roadmap-2026-11-10).

**Bugs: crowding entry, lane R1 paragraph, as it stood before sweep K3:**

  **Plan 103 lane R1, 2026-11-09:** the narrow version gains 8 held-back questions but, with the game's name typed, two lose their right note, which breaks the rule that nothing may be lost: the maintainer's call. Record: `workshop:archive/research/kb-crowding-fix-2026-11-09-p103-r1.md`.

**Bugs: crowding entry, the cause line, as it stood before sweep K3:**

  **The cause and the final-library figure** (after the 51 notes the word search returns up to ten notes instead of three, which pushes a note found only by meaning down the blend; one Mario Kart 64 note slipped out of the first three too): [Detail](roadmap-kb-details.md#plan-103-sweep-k2-notes-moved-from-the-knowledge-base-roadmap-2026-11-10). Older text: [Detail](roadmap-kb-details.md#plan-102-notes-moved-from-the-knowledge-base-roadmap-2026-11-03)

**Deck check owed: thumbs-down entry, the Deck paragraph, as it stood before sweep K3:**

  **Deck 2026-11-03 (block R1, row P102-UNDO-FOCUS-01), UNCLEAR, not a pass** (`workshop:test-evidence/plan102-P102-UNDO-FOCUS-01.json`). **Second night, 2026-11-09 (plan 103 block D0a), NOT REPRODUCIBLE:** the page kept the window's focus six times of six, so nothing was run (`workshop:test-evidence/plan103-P102-UNDO-FOCUS-01-try2.json`). Not a pass: the row stays as proven by its tests only, on the maintainer's list. The "before the fix" reading is dropped, and the first sighting's evidence: [Detail](roadmap-kb-details.md#plan-103-sweep-k1-notes-moved-from-the-knowledge-base-roadmap-2026-11-09).

**Deck check owed: screenshot-name entry, as it stood before sweep K3:**

  With a game running and a picture attached, the question now starts "This screenshot is from <game>.", on by default. PC numbers and the first try: [Detail](roadmap-kb-details.md#plan-103-sweep-k1-notes-moved-from-the-knowledge-base-roadmap-2026-11-09). Still owed. **2026-11-09 (plan 103 block D0a, second try), split:** attaching a placed picture passed (it showed first in the list); the question could not run, both tries timing out at 181 s because God of War and the AI together ran the Deck out of memory (`workshop:test-evidence/plan103-P102-PICTURE-01-try2.json`). See the screenshot entry in Next.

**Deck check owed: hidden-box entry, the still-owed line, as it stood before sweep K3:**

  **Still owed:** STRAT-SPOIL-NAME-01 could not run again on 2026-11-03 (plan 102 block R0): plan 103 block D0a tried it on 2026-11-09 with the rig launching Doom 64: Retribution by its title; the row is **UNCLEAR, not a pass**: two boss questions got general answers with no spoiler box, so there was nothing to open (`workshop:test-evidence/plan103-STRAT-SPOIL-NAME-01.json`). Earlier tries: [Detail](roadmap-kb-details.md#plan-102-notes-moved-from-the-knowledge-base-roadmap-2026-11-03)

**Deck check owed: Brotato entry, as it stood before sweep K3:**

  The rule that opens a cover by itself looked only at the running game, and Brotato was on the no-story list by its Steam number only. Its name is now on both name lists (screen and back end), and with nothing running the screen reads the game from the attached notes. Limit: with no note attached the screen cannot tell the game. Owes **P103-BROTATO-01** on the Deck. Evidence of the sighting `workshop:test-evidence/plan102-P100-HIDE-MORE-SCREEN-01-try2.json`. **Deck 2026-11-09 (block D0b, old build):** the whole answer sat behind a shut cover (`workshop:test-evidence/plan103-P103-M-BROTATO.json`).

**Deck check owed: covered-notes entry, as it stood before sweep K3:**

  A covered answer now shows a caption, "Notes were used for this answer — show the spoiler to see them" (D140 call 14), until its cover is opened. Before, the notes line waited while a cover was shut: a Grand Theft Auto IV answer showed nothing though the log and the saved chat show three notes (`workshop:test-evidence/plan102-P102-THIN-GAMES-01.json`). **Deck 2026-11-09 (block D0b, old build, `workshop:test-evidence/plan103-P103-M-COVERED-NOTES.json`):** a whole cover drew no notes line even once opened; a part cover drew it only after opening. Owes **P103-COVERED-NOTES-01** on the Deck; the caption goes on your checks page too.

**Deck check owed: checklist entry, as it stood before sweep K3:**

  Down from the Copy icon now reaches step 1, and Up from step 1 goes back into the answer, not onto Copy. Old build on the Deck 2026-11-09: Copy 3 of 3 and Mark reply helpful 3 of 3, as reported (`workshop:test-evidence/plan103-P103-M-CHECKLIST.json`). Now proven by tests that fail without the fix, with the page in focus and out of it. Owes **P103-CHECKLIST-COPY-01** (block D2). Older text: [Detail](roadmap-kb-details.md#plan-103-sweep-k2-notes-moved-from-the-knowledge-base-roadmap-2026-11-10)

**Deck check owed: details-strip entry, as it stood before sweep K3:**

  The "This answer / Session" strip and the chip grid now have their own D-pad stops, and a chip-to-chip step moves the ring while the page lacks focus. **Not seen on the Deck:** in 15 tries on 2026-11-09 the page never lost focus (`workshop:test-evidence/plan103-P103-M-DETAILS-STRIP.json`), so that half rests on tests. Owes **P103-DETAILS-STRIP-01** (block D2); row P102-UNDO-FOCUS-01 stays unread. Older text: [Detail](roadmap-kb-details.md#plan-103-sweep-k2-notes-moved-from-the-knowledge-base-roadmap-2026-11-10)

**Next: suggestion chips entry, as it stood before sweep K3:**

- ★★★ `[KB]` **Suggestion chips ordered by your last question** — **OPEN, split out of Phase 5's second half by D140 call 7 (2026-11-09).**
  A smarter order for the suggestion chips, so the first ones follow what you just asked. Plan 103 lane C1 builds it if a slot is free late in the session (Deck row P103-CHIP-ORDER-01).

**Next: screenshot measurement entry, the second-set paragraph, as it stood before sweep K3:**

  **Second set, 2026-11-09 (plan 103 lane P1, `a652ac19`):** 29 pictures from 11 games, no boss fight (target 40 with ten bosses). The marks test (lane P3) cannot run without boss pictures: a question for the maintainer (plan 103 § 12, question 3). The picture-search lane must first move a piece out of `game_ai_request.py` (797 of 800 lines): [Detail](roadmap-kb-details.md#plan-103-sweep-k1-notes-moved-from-the-knowledge-base-roadmap-2026-11-09). Still PARTIAL. [Detail](roadmap-kb-details.md#measure-how-well-the-ai-reads-a-screenshot) · older text: [Detail](roadmap-kb-details.md#plan-102-notes-moved-from-the-knowledge-base-roadmap-2026-11-03) · **From Phase 7 (call 8):** a screenshot feeding the search is not built.

**Next: RAG Phase 5, the blind-questions paragraph, as it stood before sweep K3:**

  **Blind questions:** 294 rows in ten new files under `tests/fixtures/kb_eval/` (counted from the files). **Still to write:** questions for the last ten games, the versus notes and the mod tips. The crowding fix was turned down on its numbers (Bugs). Older text: [Detail](roadmap-kb-details.md#plan-103-sweep-k2-notes-moved-from-the-knowledge-base-roadmap-2026-11-10) · [Plan](planning/28-phase5-corpus-depth.md)

**Next: honest-answer entry, the measuring paragraph, as it stood before sweep K3:**

  On eight questions no note can answer, with the repaired answer test (2026-11-09, two runs): the AI said so in its own words 0 of 24 times in both runs, the back end's "No close match" line showed in 3 of 24, and it answered as if it knew in 21 of 24. (Plan 102's 3 and 4 of 24 counted the back end's line.) The AI can now be told, before it answers, that the notes do not cover the question; it stays off, and the Speed-mode option waits on you (row P103-HONEST-01 is owed only if it is switched on).  Reports `workshop:archive/research/kb-answer-eval-2026-11-09-p103-before-run1.md` and `-run2.md`.

**Next: mod knowledge entry, the next-step paragraph, as it stood before sweep K3:**

  **Next step:** written permission from the Cyberpunk wiki's admins. **Landed 2026-11-09 (plan 103):** the library's checks accept CC0 sources (lane T3; no note uses it yet) and the first step, 18 basics tips (lane G1, above); the device side stays plan 101's. SMAPI's log folder: [Detail](roadmap-kb-details.md#plan-103-sweep-k1-notes-moved-from-the-knowledge-base-roadmap-2026-11-09). [Plan 101](planning/101-deep-mod-ai-hints.md) · earlier text: [Detail](roadmap-kb-details.md#plan-102-notes-moved-from-the-knowledge-base-roadmap-2026-11-03)

**Calls: the ten-note samples line, as it stood before sweep K3:**

  Six samples of ten random notes each, in the workshop's checks folder: `workshop:checks/plan103-sample-earlier.md` (the 169 notes plans 100 and 102 added), `plan103-sample-B.md`, `-C.md`, `-D.md`, `-E.md` and `-F.md` (which games each one draws on: [Detail](roadmap-kb-details.md#plan-103-sweep-k2-notes-moved-from-the-knowledge-base-roadmap-2026-11-10)). Sample B was drawn before three small last fixes; it is refreshed before you read it. A sample for any later games is added here when its file exists.

**Deck check owed: eight thin games entry, the first line, as it stood before sweep K3:**

  118 notes in the labelled shape: Grand Theft Auto V, Grand Theft Auto IV, Super Mario 64, Paper Mario: The Thousand-Year Door, Doom 64, Donkey Kong 64 and Mario Kart 64 15 each, Pikmin 2 13 (landing commits in [Detail](roadmap-kb-details.md#plan-102-notes-moved-from-the-knowledge-base-roadmap-2026-11-03)). [Detail](roadmap-kb-details.md#plan-103-notes-moved-from-the-knowledge-base-roadmap-2026-11-09)

**Next: RAG Phase 5, the own-words line, as it stood before sweep K3:**

  **House "own words" pass:** eight files were rewritten after the licence read found lines too close to the wiki's sentences (no fact changed, no note renamed); the lesson is in the lessons file.

**Next: screenshot measurement entry, the step lines, as they stood before sweep K3:**

  Step 1: a labelled picture set and a scoring script. **Step 2, on this PC:** the picture models the Deck offers read far better than its starter model (qwen3.5:4b named the game 97 and the place 70 times in a hundred, against 67 to 70 and 52 to 53). Figures and reports: [Detail](roadmap-kb-details.md#plan-103-notes-moved-from-the-knowledge-base-roadmap-2026-11-09).

**Next: screenshot measurement entry, the second-set line as sweep K3 first wrote it:**

  **Second set, 2026-11-09 (lane P1, `a652ac19`):** 29 pictures from 11 games, no boss fight (target 40 with ten bosses); the marks test (lane P3) cannot run without boss pictures: a question for the maintainer (plan 103 § 12, question 3).

**Next: KB visual maps entry, the route line, as it stood before sweep K3:**

  **A route, one step at a time:** built 2026-10-24 (its entry is in Done); the "Needs: …" part was removed 2026-11-03.

**Next: honest-answer entry, the older-figures line, as it stood before sweep K3:**

  Older figures: [Detail](roadmap-kb-details.md#plan-103-sweep-k1-notes-moved-from-the-knowledge-base-roadmap-2026-11-09) **One of the eight questions changed on 2026-11-10:** the "cannot be answered" row about the DOOM Eternal Prowler now asks about the Hell Priest, because the Prowler got a note, so the 2026-11-09 counts were measured with the old row and one question of 24 differs from now on.

**Next: mod knowledge entry, the found line, as it stood before sweep K3:**

  **Found:** LOOT's rule lists are CC0 (free to use); the Cyberpunk wiki has no licence; Stardew Valley's sources are NonCommercial or mixed ([Detail](roadmap-kb-details.md#plan-103-notes-moved-from-the-knowledge-base-roadmap-2026-11-09)). Report `workshop:planning/assets/101-mod-knowledge-sources.md`.

**The middle measurement, 2026-11-10 (plan 103 lane X1): the library at 891 notes, 38 games and 185 tips (583 notes and 167 tips before).** Reports in the workshop's `archive/research/`: `kb-embed-bakeoff-2026-11-10-arms-p103-middle.md` (and `.json`), `kb-floor-holdout-2026-11-10-p103-middle.txt` (and `.json`), `kb-answer-eval-2026-11-10-p103-middle-run1.md`, `-run2.md` and `-story.md`.

- **Search, the same 628 held-back questions, right note in the first three:** the blend 581 before, 572 now (92.5 to 91.1 percent); the meaning search alone 580 to 577; the word search alone 534 to 526. **The thirty meaning-only questions:** the blend 23 before, 18 now; the meaning search alone 28 and 28. Fifteen questions lost their note from the first three and one gained it; most were pushed out by a new enemy, item or versus note that shares a word with the question. This is the crowding problem, and it grew with 308 more notes.
- **The first ten games' 294 blind questions:** 246 find their note in first place, 281 in the first three; 13 miss.
- **Left 4 Dead 2's 18 labelled questions:** first place 9, first three 17 (11 and 18 before the versus notes). The Left 4 Dead 2 paragraph in the sweep K2 section above says "unchanged" for the first three; this later measurement says 18 before.
- **Tips reach:** unchanged (19 of 24 reach a tip, 17 the right one, none wrong).
- **Answers:** facts kept 70.1 and 68.9 percent in two runs (73.4 and 71.8 before; slightly outside the gap between runs); the right note attached 94.9 percent (96.6 before); contradictions and the spoiler cover inside the gap. The honest "I don't know" counts are unchanged (3 of 24 by the plugin's own line, 0 of 24 in the AI's own words), as expected with that sentence switched off. Story-beat questions: a cover showed 39 of 45 times, before and now.

**The crowding fix, measured again on today's library (lane R1b): still turned down, nothing landed.** It brings back 12 of the older held-back questions on the search test and lifts the thirty meaning-only questions from 18 to 25, but it loses 5 of the new held-back questions there, and on the plugin's own search it loses 23 questions and gains 16 (seven fewer right notes of 1,385); an exact word match leaves first place on seven questions; "No close match" newly shows on two. The cause it found: every game's "Starting out" note ranks high by meaning, and the fix lifts it past a note the word search really found. Record: `workshop:archive/research/kb-crowding-fix-2026-11-10-p103-r1b.md`. The trade stays the maintainer's; an idea for a later session is to leave "Starting out" notes out of the lift.

**Suggestion chips ordered by the last question (plan 103 lane C1, landed 2026-11-10, four commits `f1d82a46`, `44ac6b3e`, `3c466baa`, `4c59ac6e`; the last one puts the ordering behind an inner function so the public call keeps its frozen shape):** after an answer, the game's chips lead with up to four notes closest to the question just asked; today's order carries on behind them; a cold open keeps today's order; no new call to a model (the search hands over the vector it already made). Spoiler-kind notes (boss, enemy, dungeon, quest, area, ending, story, puzzle, secret) come forward only if today's chips already offer them or the question itself named them. Measured on this PC, thirty questions in six games: chips about the question's subject among the first three, 12 of 90 before and 33 of 90 after; 10 of 30 questions had one before, 24 after (`workshop:archive/research/2026-11-10-p103-c1-chip-order-thirty-questions.md`). **A limit:** after the first deal the screen's rotation picks at random among the game's chips, so the closest note is sure of only one spot and only until that spot turns over. Deck row owed: P103-CHIP-ORDER-01 (block D3).

**The picture's own guess joins the note search (plan 103 lane P2, six commits, landed switched off):** `c93832e7` (the short first look), `0e764abe` (the test that measures it), `f9309c28` (the reader also understands "Game: X, Place: Y, Enemy: Z" on one line), `a988712e` (a Stop pressed while the picture is shrunk now counts), `087a878b` (the ask path can use the guess in the note search), `d88a7430` (the knowledge-base doc's three rows). Built in both rounds: a short first question to the picture model (game, place, enemy; "not sure" allowed) whose words join the search words only. Off because only four of the 29 labelled pictures name a note and none shows a boss, too few to decide on. Measured on this PC all the same: on those four pictures (five tries each, two typed questions) today's search found the right note 0 of 40 times, and with the guess 17 of 40 for the Deck's starter picture model and 4 of 40 for `qwen3.5:4b`, mostly by generic words; over all 29 pictures the starter model named the game right on 4 and `qwen3.5:4b` on 19; each said something wrong with confidence on 12 and 10. The first call took 1.7 seconds on average (starter model) and 0.7 (qwen) on this PC; not measured on the Deck. Reports in the workshop's `archive/research/`: `picture-guess-search-2026-11-10-p103-p2.md`, `-run2.md` and `-four-x5.md`. **Before it is ever switched on:** more pictures with notes and bosses; a security read; a check that a guessed boss name cannot count as the player having named it for the spoiler rules; the Deck's seconds; the case with no game running. No Deck row (P103-PICTURE-SEARCH-01 runs only if it lands on). The three rows of `docs/knowledge-base.md` that lane P2 wrote agree with these numbers.

**Blind test questions for the last ten games that got notes (lanes Q4, second part, and Q5; 292 rows in ten new files under `tests/fixtures/kb_eval/`, counted from the files):** Super Smash Bros. Melee 30, Grand Theft Auto III 30, Yoshi's Story 30, Diddy Kong Racing 28, Fallout: New Vegas 28, Brotato 30, Palworld 28, Skyrim Special Edition 28, Hollow Knight 30, DOOM Eternal 30. With the ten files that landed before, every one of the 20 games that got notes has its blind questions: 586 rows in 20 files. Nothing was written for Hades, Half-Life 2 and Black Mesa, which got no notes. **Lane Q6, part 1 (`919696de`):** the eight unanswered Left 4 Dead 2 versus questions: six now name a versus note; two stay empty on purpose (`V2-S-L4D2-12` asks about a spot on a finale map, which the notes leave out; `V2-S-L4D2-17` cannot be answered without a campaign). **Part 2 (`73ff224b`):** 36 mod-tip questions, two per tip, in `tests/fixtures/kb_eval/p103-mods.json`; every row reaches the mod tips by the router's own words.

**Corrections to older notes (plan 103 lane M, 2026-11-10, six commits `21268cbf`, `927f18b9`, `ea5136f0`, `849932ae`, `ab00958a`, `c3e2eaa1`; seed file only, 13 lines):** Diddy Kong Racing (four notes), Yoshi's Story (four), Left 4 Dead 2 (the Charger and Smoker notes), Hollow Knight (the Crossroads tram goes to the Resting Grounds), Fallout: New Vegas (the doctor's bag), Palworld (Predator Pals and Raid Bosses). **Left open:** the Left 4 Dead 2 Molotov note (its two pages do not clearly disagree; 75 seconds, 80 and 85 on the harder settings); the Fallout: New Vegas Hardcore note still lists fewer ways to heal a limb than its page does (the page adds the weapon binding ritual and the Auto-Doc); the Palworld wiki's own pages disagree on whether Predator Pals are scripted. The older sightings listed in sweep K2 (Mario Party, Mario Party 2, 6 and 7, Super Smash Bros., Cyberpunk 2077, Grand Theft Auto III) are not named in lane M's list of fixes; the roadmap entry says they were not in it.

**Counts checked by sweep K3 (2026-11-10, counted from the files):** 33 notes files under `data/kb/notes/` hold 477 notes for 32 games; the seed holds 414; together 891 (583 before this session, so 308 are new this session). The 477 is the size of the notes files (it includes 169 notes from plans 100 and 102), not the number new this session; the 308 new this session are 293 for the twenty games plus the 15 versus notes. Sweep K2's roadmap lines (477 in the notes files, 293 for the twenty games) are right; its details line that says "14 or 15 each, 308 notes" counts the versus notes too. Questions: 622 rows in 21 files under `tests/fixtures/kb_eval/` (586 for the 20 games, 36 for the mod tips).

**The Deck, as of the morning of 2026-11-10:** asleep since about 01:10 EST; nothing deployed; blocks D1, D2, D3 and DR have not run. Their runbooks are `docs/planning/assets/103-runbook-block-D1.md`, `-D2.md` and `-D3-DR.md`. Combine OverWiki was still read-only at 06:04 EST on 2026-11-10 (third try), so Half-Life 2 and Black Mesa stay without notes.

## Plan 103 end audit K9 notes moved from the knowledge base roadmap (2026-11-10)

Written by the plan 103 bookkeeper end audit (K9), after the last landing (lane V3) and the final measurement (lane X2). Older text is moved word for word, each under a line saying where it stood; the final figures are listed in full after it.

**Where things stand: the answer-test and 891-note paragraphs, as they stood before the end audit:**

**The answer test was repaired on 2026-11-09 (plan 103):** older answer-quality figures must not be compared with new ones. New baseline, two runs: facts kept 73.4 and 71.8 in a hundred, story cover 39 of 45.
**On the 891-note library (2026-11-10, lane X1):** the same 628 held-back questions find their note in the first three 91.1 times in a hundred (92.5 before); facts kept in answers 70.1 and 68.9 (73.4 and 71.8). Reports and all figures: [Detail](roadmap-kb-details.md#plan-103-sweep-k3-notes-moved-from-the-knowledge-base-roadmap-2026-11-10)

**Bugs: crowding entry, the lane R1b and cause paragraphs, as they stood before the end audit:**

  **Plan 103 lane R1b, 2026-11-10, on the 891-note library:** the crowding grew (581 to 572 of 628 in the first three; the thirty meaning-only questions 23 to 18). The fix loses 23 questions on the plugin's own search and gains 16. Cause: every game's "Starting out" note is lifted past a note the word search found. Nothing landed; the trade stays yours. Record `workshop:archive/research/kb-crowding-fix-2026-11-10-p103-r1b.md`; lane R1's text and the numbers: [Detail](roadmap-kb-details.md#plan-103-sweep-k3-notes-moved-from-the-knowledge-base-roadmap-2026-11-10)
  **Cause:** after the 51 notes the word search returns up to ten notes instead of three, which pushes a note found only by meaning down the blend. Full text and older figures: [Detail](roadmap-kb-details.md#plan-103-sweep-k3-notes-moved-from-the-knowledge-base-roadmap-2026-11-10)

**Next: the online and versus entry, as it stood before the end audit:**

- ★★★★ `[KB]` **KB online / versus strategy content** — **PARTIAL, discovery locked 2026-08-09; steps one and two landed for Left 4 Dead 2 (2026-11-09, 2026-11-10).** Multiplayer questions
  (roles, callouts, co-op) got nothing specific. Plan: new card kinds, Left 4 Dead 2 first, then Counter-Strike 2 (out of plan 103), from archive dumps only. **Step one (lane V1):** five new note kinds count as low spoiler risk, with their own chip wording. **Step two (lane V2):** 15 versus notes (ten versus, three callout, one survival, one realism) and the seven "Playing as the ..." notes re-filed as versus; no finale content. **Measured (2026-11-10, lane X1):** of the 18 labelled Left 4 Dead 2 search questions, 9 find their note first (11 before these notes) and 17 in the first three (18 before). **Questions (lane Q6, `919696de`):** six of the eight unanswered versus questions now name a versus note; two stay empty on purpose (a finale-map spot, a campaign). Owes **P103-VERSUS-01** on the Deck (needs the session's library installed). Earlier text: [Detail](roadmap-kb-details.md#plan-103-sweep-k2-notes-moved-from-the-knowledge-base-roadmap-2026-11-10) ·
  [Plan](planning/17-kb-online-versus-strategy-content.md) · [Detail](roadmap-kb-details.md#kb-online--versus-strategy-content-and-rag-phase-5)

**Next: the screenshot measurement entry, the second-set and picture's-guess paragraphs, as they stood before the end audit:**

  **Second set, 2026-11-09 (lane P1, `a652ac19`):** 29 pictures from 11 games, no boss fight (target 40); the marks test (lane P3) waits on boss pictures: plan 103 § 12, question 3.
  **The picture's own guess joins the note search (lane P2, 2026-11-10, six commits from `c93832e7` to `d88a7430`): landed switched off (call 10).** A short first question to the picture model (game, place, enemy) whose words join the search words only. Off: only four of 29 labelled pictures name a note and none shows a boss. On this PC, on those four (40 tries): today's search found the right note 0 times, with the guess 17 (starter picture model) and 4 (`qwen3.5:4b`), mostly by generic words; first call 1.7 s and 0.7 s, not measured on the Deck. **Before it is switched on:** more pictures, a security read, a spoiler-rule check on a guessed boss name, the Deck's seconds. No Deck row unless it goes on (P103-PICTURE-SEARCH-01). Report `workshop:archive/research/picture-guess-search-2026-11-10-p103-p2.md`; figures: [Detail](roadmap-kb-details.md#plan-103-sweep-k3-notes-moved-from-the-knowledge-base-roadmap-2026-11-10) · Still PARTIAL. **From Phase 7 (call 8):** a screenshot feeding the search is built, switched off.

**Next: Phase 5, the blind-questions paragraph, as it stood before the end audit:**

  **Blind questions (counted from the files):** all 20 games that got notes have blind questions: 586 rows in 20 files under `tests/fixtures/kb_eval/` (the last ten games' 292 landed 2026-11-10, lanes Q4 and Q5; none for Hades, Half-Life 2, Black Mesa). **First ten games' 294:** 246 find their note first, 281 in the first three, 13 miss. Older text: [Detail](roadmap-kb-details.md#plan-103-sweep-k3-notes-moved-from-the-knowledge-base-roadmap-2026-11-10) · [Plan](planning/28-phase5-corpus-depth.md)

**Next: the honest-answer entry, the changed-question paragraph, as it stood before the end audit:**

  **One of the eight questions changed on 2026-11-10:** the Prowler row now asks about the Hell Priest (the Prowler got a note), so one question of 24 differs from the 2026-11-09 counts. Older figures: [Detail](roadmap-kb-details.md#plan-103-sweep-k1-notes-moved-from-the-knowledge-base-roadmap-2026-11-09)

**Deck check owed: the eight thin games' entry, the body as it stood before the end audit:**

  118 notes in the labelled shape for Grand Theft Auto V, Grand Theft Auto IV, Super Mario 64, Paper Mario: The Thousand-Year Door, Doom 64, Donkey Kong 64, Mario Kart 64 and Pikmin 2 (landing commits: [Detail](roadmap-kb-details.md#plan-103-sweep-k3-notes-moved-from-the-knowledge-base-roadmap-2026-11-10)).
  236 blind questions for them are in the search test. **Deck 2026-11-03 (row P102-THIN-GAMES-01), PASSED 8 of 8** (`workshop:test-evidence/plan102-P102-THIN-GAMES-01.json`; the note numbers: [Detail](roadmap-kb-details.md#plan-103-sweep-k1-notes-moved-from-the-knowledge-base-roadmap-2026-11-09)).

**Deck check owed: the Brotato cover entry, the body as it stood before the end audit:**

  The rule that opens a cover by itself looked only at the running game, and Brotato was on the no-story list by its Steam number only. Its name is now on both name lists, and with nothing running the screen reads the game from the attached notes (with no note attached it cannot tell the game). Owes **P103-BROTATO-01** on the Deck. Sighting `workshop:test-evidence/plan102-P100-HIDE-MORE-SCREEN-01-try2.json`, old build `workshop:test-evidence/plan103-P103-M-BROTATO.json`. Full text: [Detail](roadmap-kb-details.md#plan-103-sweep-k3-notes-moved-from-the-knowledge-base-roadmap-2026-11-10)

**Deck check owed: the covered-answer caption entry, the body as it stood before the end audit:**

  A covered answer now shows a caption, "Notes were used for this answer — show the spoiler to see them" (D140 call 14), until its cover is opened. Old build: `workshop:test-evidence/plan103-P103-M-COVERED-NOTES.json`. Owes **P103-COVERED-NOTES-01** on the Deck; the caption goes on your checks page too. Full text: [Detail](roadmap-kb-details.md#plan-103-sweep-k3-notes-moved-from-the-knowledge-base-roadmap-2026-11-10)

**Deck check owed: the checklist and Copy icon entry, the body as it stood before the end audit:**

  Down from the Copy icon now reaches step 1, and Up from step 1 goes back into the answer, not onto Copy. Proven by tests that fail without the fix (old build: `workshop:test-evidence/plan103-P103-M-CHECKLIST.json`). Owes **P103-CHECKLIST-COPY-01** (block D2). Older text: [Detail](roadmap-kb-details.md#plan-103-sweep-k3-notes-moved-from-the-knowledge-base-roadmap-2026-11-10)

**Deck check owed: the details strip entry, the body as it stood before the end audit:**

  The "This answer / Session" strip and the chip grid now have their own D-pad stops, and a chip-to-chip step moves the ring while the page lacks focus. **Not seen on the Deck** (the page never lost focus in 15 tries, `workshop:test-evidence/plan103-P103-M-DETAILS-STRIP.json`): that half rests on tests. Owes **P103-DETAILS-STRIP-01** (block D2); row P102-UNDO-FOCUS-01 stays unread. Older text: [Detail](roadmap-kb-details.md#plan-103-sweep-k3-notes-moved-from-the-knowledge-base-roadmap-2026-11-10)

**Deck check owed: the thumbs-down Undo entry, the Deck paragraph as it stood before the end audit:**

  **Deck:** UNCLEAR 2026-11-03 (`workshop:test-evidence/plan102-P102-UNDO-FOCUS-01.json`); NOT REPRODUCIBLE 2026-11-09, the page kept the window's focus six times of six (`workshop:test-evidence/plan103-P102-UNDO-FOCUS-01-try2.json`). Not a pass: proven by its tests only, on the maintainer's list. Full text: [Detail](roadmap-kb-details.md#plan-103-sweep-k3-notes-moved-from-the-knowledge-base-roadmap-2026-11-10)

**Deck check owed: the screenshot-reading entry, the body as it stood before the end audit:**

  With a game running and a picture attached, the question now starts "This screenshot is from <game>.", on by default. Still owed. **2026-11-09 (block D0a), split:** attaching a placed picture passed; the question could not run (`workshop:test-evidence/plan103-P102-PICTURE-01-try2.json`). PC numbers and full text: [Detail](roadmap-kb-details.md#plan-103-sweep-k3-notes-moved-from-the-knowledge-base-roadmap-2026-11-10)

**Deck check owed: the cover-opened-by-itself entry, the body as it stood before the end audit:**

  On a no-story game, or after consent, the plugin opens a cover by itself; the notes line then kept waiting for a cover the screen had already opened. It no longer waits. Owes **P103-NOTES-AFTER-AUTO-OPEN-01** on the Deck: Deep Rock Galactic: Survivor running, or Brotato with nothing running, an answer with a cover: no cover is drawn and the notes line is there.

**Deck check owed: the mod basics tips entry, the body as it stood before the end audit:**

  The first step of "Mod knowledge for modded games" (plan 101's knowledge-cards lane, run as lane G1): tips 168 to 185, topic "mods", and the words that route a question to them. The licence read found nothing that blocks. **Test questions (lane Q6, `73ff224b`):** 36 rows, two per tip, in `tests/fixtures/kb_eval/p103-mods.json`; every row reaches the mod tips by the router's own words. Owes **P103-MODS-TIPS-01** on the Deck.

**Deck check owed: the chip order entry, the body as it stood before the end audit:**

  After an answer, the game's chips lead with up to four notes closest to the question just asked; today's order follows; a cold open is unchanged; no new call to a model. Spoiler-kind notes come forward only if today's chips offer them or the question named them. On this PC, thirty questions in six games: a chip about the question's subject among the first three 12 of 90 before, 33 of 90 after (`workshop:archive/research/2026-11-10-p103-c1-chip-order-thirty-questions.md`).

**Next: the honest-answer entry, the body as it stood before the end audit:**

  On eight questions no note can answer, with the repaired answer test (2026-11-09, two runs): the AI said so in its own words 0 of 24 times, the back end's "No close match" line showed in 3 of 24, and it answered as if it knew in 21 of 24 (same counts on 2026-11-10, lane X1). The fix (the AI told, before it answers, that the notes do not cover the question) stays off; the Speed-mode option waits on you (P103-HONEST-01 only if switched on). Reports `workshop:archive/research/kb-answer-eval-2026-11-09-p103-before-run1.md`, `-run2.md`. Full text: [Detail](roadmap-kb-details.md#plan-103-sweep-k3-notes-moved-from-the-knowledge-base-roadmap-2026-11-10)

**Next: the mod knowledge entry, the body as it stood before the end audit:**

- ★★★ `[KB]` **Mod knowledge for modded games** — **OPEN, filed 2026-10-27 (plan 101, round 4); sources and licences listed 2026-11-02 (plan 102 lane J).** Known mod problems and load-order rules for the games people mod most, so "what's wrong with my load order" and "do these two mods clash" get an offline answer that names the mods bonsAI found on the device. Nexus Mods pages are never copied.
  **Found:** LOOT's rule lists are CC0; the Cyberpunk wiki has no licence; Stardew Valley's sources are NonCommercial or mixed. Report `workshop:planning/assets/101-mod-knowledge-sources.md`.
  **Next step:** written permission from the Cyberpunk wiki's admins. **Landed 2026-11-09 (plan 103):** CC0 sources pass the library's checks (lane T3) and the first step, 18 basics tips (lane G1). The device side stays plan 101's. [Plan 101](planning/101-deep-mod-ai-hints.md) · text and SMAPI's log folder: [Detail](roadmap-kb-details.md#plan-103-sweep-k3-notes-moved-from-the-knowledge-base-roadmap-2026-11-10)

**Where things stand: the library paragraph, as it stood before the end audit:**

**The source now has more than any build** (counted from the files on 2026-11-10): **891 notes in all**, the seed's 414 plus 477 in 33 notes files for 32 games, **308 of them new this session** (583 before), plus plan 103's 18 mod tips (ids 168 to 185, 185 tips in all). **35 of the 38 games have notes in the labelled short-line shape** (15 before plan 103); Hades, Half-Life 2 and Black Mesa do not (see Phase 5). A new build and publish are owed.

**Bugs: older notes the wiki contradicts, the Left open paragraph, as it stood before the end audit:**

  **Left open:** the Left 4 Dead 2 Molotov note (its two pages do not clearly disagree); the Fallout: New Vegas Hardcore note lists fewer ways to heal a limb than its page; the Palworld wiki's own pages disagree on whether Predator Pals are scripted; older sightings (Mario Party, Cyberpunk 2077, others) were not in lane M's list. Game by game: [Detail](roadmap-kb-details.md#plan-103-sweep-k3-notes-moved-from-the-knowledge-base-roadmap-2026-11-10)

**Next: Phase 5, the no-notes paragraph, as it stood before the end audit:**

  **No notes for three games:** Hades (its wiki is CC BY-NC-SA and Wikipedia has too little); Half-Life 2 and Black Mesa (combineoverwiki.net answered "Database is read-only" on every read on 2026-11-09 and again on 2026-11-10, three tries each night). Left open with the reason. **House "own words" pass:** eight files rewritten, no fact changed (the lessons file).

**Next: the screenshot measurement entry, the Step 2 paragraph, as it stood before the end audit:**

  Step 1: a labelled picture set and a scoring script. **Step 2, on this PC:** the picture models the Deck offers read far better than its starter model (qwen3.5:4b named the game 97 and the place 70 times in a hundred, against 67 to 70 and 52 to 53): [Detail](roadmap-kb-details.md#plan-103-notes-moved-from-the-knowledge-base-roadmap-2026-11-09).

**Bugs: the ACCEPTED entry on the meaning half, as it stood before the end audit (its links are kept in the entry's new line or point here):**

- ★★★★ `[KB]` **What ships loses to its own meaning half on questions nobody tuned against** — **ACCEPTED, decided
  2026-09-06.** The finding and its reasons: [Detail](roadmap-kb-details.md#plan-103-notes-moved-from-the-knowledge-base-roadmap-2026-11-09).
  Weights stay even. [D82](audit/maintainer-decisions-locked.md#d82--open-raised-2026-09-06--leaning-the-search-on-meaning-wins-on-the-measurements-and-breaks-three-rules-we-set-on-purpose) · [Detail](roadmap-kb-details.md#the-shipping-retrieval-arm-loses-to-the-vector-half-alone-on-rows-nobody-tuned-against) · the 2026-11-02 sentence: [Detail](roadmap-kb-details.md#plan-102-notes-moved-from-the-knowledge-base-roadmap-2026-11-03)

**Bugs: the ACCEPTED entry on unrelated questions, as it stood before the end audit:**

- ★★ `[KB]` **Unrelated questions can still get a game card stapled on** — **ACCEPTED 2026-08-27.** Raising the word floor costs real matches and the
  model mostly ignores a card that does not fit. Earlier sightings: [Detail](archive/roadmap-trimmed-2026-10-roadmap-kb-details.md#plan-100-notes-moved-from-the-knowledge-base-roadmap-2026-10-25)
  [D28](audit/maintainer-decisions-archive.md#d28--ordinary-phrases-attach-game-cards-how-hard-should-the-floor-be) ·
  [Detail](roadmap-kb-details.md#ordinary-phrases-attach-game-cards)

**Deck check owed: the hidden spoiler box entry, as it stood before the end audit:**

- ★★ `[KB]` **Hidden spoiler box stays shut on games with no Steam ID and on name-first questions** — **VERIFY, landed
  2026-09-15, unit-tested.** A game known only by name now opens its box, and naming the boss up front keeps the answer in
  plain text. Passed on the Deck: name-first and knowledge base off (earlier rows: [Detail](roadmap-kb-details.md#plan-103-notes-moved-from-the-knowledge-base-roadmap-2026-11-09)).
  **Still owed:** STRAT-SPOIL-NAME-01 is **UNCLEAR, not a pass** (plan 103 block D0a, 2026-11-09: two boss questions got general answers with no spoiler box; `workshop:test-evidence/plan103-STRAT-SPOIL-NAME-01.json`). Earlier tries: [Detail](roadmap-kb-details.md#plan-103-sweep-k3-notes-moved-from-the-knowledge-base-roadmap-2026-11-10)
  Evidence `workshop:test-evidence/plan79-STRAT-SPOIL-NAME-01.json`. [Detail](roadmap-kb-details.md#hidden-spoiler-box-stays-shut-on-games-with-no-steam-id-and-on-name-first-questions)

**Deck check owed: the thumbs-down Undo entry, its first body line, as it stood before the end audit (the Deck line that followed is in the block above):**

  The thumbs-down rows now ask the panel's window for its focus when the ring lands on them (earlier text: [Detail](roadmap-kb-details.md#plan-103-notes-moved-from-the-knowledge-base-roadmap-2026-11-09)).
  **Deck:** UNCLEAR 2026-11-03 (`workshop:test-evidence/plan102-P102-UNDO-FOCUS-01.json`); NOT REPRODUCIBLE 2026-11-09, six times of six (`workshop:test-evidence/plan103-P102-UNDO-FOCUS-01-try2.json`). Not a pass: proven by its tests only. Full text: [Detail](roadmap-kb-details.md#plan-103-end-audit-k9-notes-moved-from-the-knowledge-base-roadmap-2026-11-10)

**Deck check owed: the troubleshooting-symptom entry, the body as it stood before the end audit:**

  "The game drops me back to the library" reached no crash tip. The held meaning search stays held. The wording fix is in [Done](roadmap.md#done-after-v060) ("A troubleshooting question mostly never reaches the tips"); the numbers are there. Deck 2026-10-26: row P100-TIPS-01 failed on one of three sentences; the retry P100-TIPS-01-try3 passed.
  The find-my-PC part (tip 167, plan 102 lane H) passed on the Deck 2026-11-03: see Done. Older text: [Detail](archive/roadmap-trimmed-2026-10-roadmap-kb-details.md#plan-100-notes-moved-from-the-knowledge-base-roadmap-2026-10-25)

**Deck check owed: the chip order entry, its limit line, as it stood before the end audit:**

  **A limit:** after the first deal the screen's rotation picks at random among the chips, so the closest note is sure of one spot only until it turns over. Owes **P103-CHIP-ORDER-01** on the Deck (block D3).

**Next: Phase 5, the first line, as it stood before the end audit:**

- ★★★★ `[KB]` **RAG Phase 5: depth on the 23 games** — **PARTIAL.** The thirteen original titles went from 133 to 164 notes; plans 100 and 102 added 51 and 118. **Plan 103: 20 of the 23 games now have enemy and item notes in the labelled shape** (14 or 15 each, 293 notes, counted from the files), each read by a checker and a licence reviewer and then fixed (the games: [Detail](roadmap-kb-details.md#plan-103-sweep-k2-notes-moved-from-the-knowledge-base-roadmap-2026-11-10)). With them 35 of 38 games have labelled notes (15 before). Each batch closes on your read of ten random notes (D140, call 4; see Calls). Deck row owed: **P103-NOTES-23-01** (block D3).

**Calls: the ten-note samples call, as it stood before the end audit:**

  Six samples of ten random notes each, in the workshop's checks folder: `workshop:checks/plan103-sample-earlier.md` and `plan103-sample-B.md` to `-F.md` (the games each draws on: [Detail](roadmap-kb-details.md#plan-103-sweep-k3-notes-moved-from-the-knowledge-base-roadmap-2026-11-10)). Sample B is refreshed before you read it.

**The final numbers, in full (lane X2, 2026-11-10; library 891 notes, 38 games, 185 tips, counted from the data files by this audit):**

- **Reports in the workshop's `archive/research/`:** `kb-embed-bakeoff-2026-11-10-arms-p103-after.md`, `kb-floor-holdout-2026-11-10-p103-after.txt`, `kb-answer-eval-2026-11-10-p103-after-run1.md`, `-run2.md` and `-story.md`.
- **Notes with labelled enemy or item lines:** 35 of the 38 games (15 before this session).
- **The same 628 older held-back questions, right note in the first three:** 581 before the session, 572 after; the thirty meaning-only questions 23, then 18.
- **The 586 blind questions for the 20 games:** 477 in first place, 548 in the first three (93.5 percent; both counted again from the report's per-question rows). Weakest: Brotato 21 of 30, DOOM Eternal 25 of 30, Yoshi's Story 25 of 30; most misses are typo questions or a "Starting out" or group note taking the place.
- **The six newly labelled versus rows:** five in the first three. **The 36 mod questions:** all reach the mod tips; 30 reach their own tip first; three reach another topic's tip (`V2-P103-MODS-27`, `-31`, `-32`).
- **Tips on the 24 blind sentences:** unchanged (19 reach a tip, 17 the right one, none a wrong one).
- **Answers:** facts kept 70.6 and 71.8 percent (73.4 and 71.8 before); the gap is the two Left 4 Dead 2 questions lane V3 then worked on, the rest is level. The honest "I don't know" counts are unchanged (3 of 24, and 0 of 24 in the AI's own words). A spoiler cover showed on 39 of 45 story-beat tries, before and after.
- **A note for the testing notes:** the morning's "middle" second run reused the first run's seeds, so its 68.9 percent was not an independent draw; use `--seed-base 2` for a second run.

**Lane V3, a versus note took the place of the note a question needs (2026-11-10, four commits: `06039e83`, `d409b7a2`, `9bb27bdf`, `fb86e122`):**

- **Found by the final measurement:** "how to beat tank" led with the versus note about surviving the Tank, and "tips for playing as the hunter in versus" in Speed mode attached the survivors' note instead of "Playing as the Hunter". In the answer test those two questions fell from 5 of 6 and 6 of 6 replies keeping the facts to 1 and 0.
- **Fixed two ways:** four versus notes lost "in versus" from their names (test row `V2-S-L4D2-20` was renamed with them), and a narrow rule in the search: when the first note is a game-mode note (versus, callout, survival, realism) and the question names no mode and no side, the ordinary note the question names by its title leads; nothing is filtered and a versus note still attaches. The search test's script now hands the question to the blend, so it measures this rule.
- **Measured:** the Hunter question attaches "Playing as the Hunter" again (9 of 9 tries, facts kept 9 of 9); the Tank question leads with "Tank". Of the 68 labelled Left 4 Dead 2 rows in the search test, 56 are in the first three before and after and none is lost; four gain first place and four "Playing as the ..." rows move from first to second, still attached. No row of any other game moves (1,558 rows). On the plugin's own search over 140 Left 4 Dead 2 asks, the right note attaches for 115 (112 before). Files with `p103-v3` in the research folder; the search test after the fix is `kb-embed-bakeoff-2026-11-10-arms-p103-v3-final.md`.
- **Left open:** the Tank answer still uses the versus note's advice, because that note attaches second; the rule is not on the Speed-mode path; the Hunter question in Strategy mode still leads with the survivors' note; six test rows did not get their note back (`V2-S-L4D2-29`, `V2-PARA-S03`, `V2-BLINDT-19`, `V2-BLINDT-23`, `V2-P103-L4D2-13`, `-16`).
- **A correction to the Left 4 Dead 2 count (end of session):** of the 18 older labelled Left 4 Dead 2 questions, the number in the first three is **17 now; 18 in the 9 November file**. Two helpers measured it differently (the 9 November file, and the session's own run after the versus notes landed, which called it unchanged). The lines above and in the sweep K2 and K3 sections that say "17 (18 before)" or "(11 and 18 before)" carry that reading; none of them means the count is unchanged.

## Plan 103 sweep K10 notes moved from the knowledge-base roadmap (2026-11-10)

Moved word for word by the sweep after Deck blocks D1 and D2. The first paragraph is the final measurement that stood under "Where things stand"; the four entries after it passed on the Deck 2026-11-10 and moved to Done in [roadmap.md](roadmap.md#done-after-v060).

**Final measurement (2026-11-10, lane X2, 891 notes; the answer test was repaired on 2026-11-09, so older answer figures are not comparable):** the same 628 older held-back questions find their note in the first three 572 times (581 before); the thirty meaning-only ones 18 (23). The 586 blind questions: 477 first, 548 in the first three (93.5 in a hundred). Facts kept in answers 70.6 and 71.8 in a hundred (73.4 and 71.8); the gap is two Left 4 Dead 2 questions lane V3 then worked on. [Detail](roadmap-kb-details.md#plan-103-end-audit-k9-notes-moved-from-the-knowledge-base-roadmap-2026-11-10)

- ★ `[KB]` **On a no-story game named in the question, with nothing running, a cover under Default did not open by itself (Brotato, 2026-11-03)** — **VERIFY, fixed 2026-11-09 (plan 103 lane S1, `8107800e`, `f79a8634`). Was OPEN, found 2026-11-03 (plan 102 Deck block R0).**
  Brotato's name is now on both name lists. Owes **P103-BROTATO-01** on the Deck. Old build `workshop:test-evidence/plan103-P103-M-BROTATO.json`; sighting `workshop:test-evidence/plan102-P100-HIDE-MORE-SCREEN-01-try2.json`. [Detail](roadmap-kb-details.md#plan-103-end-audit-k9-notes-moved-from-the-knowledge-base-roadmap-2026-11-10)
- ★ `[KB]` `[ui]` **A spoiler-covered answer draws no notes chip** — **VERIFY, fixed 2026-11-09 (plan 103 lane S1, `056dfcdf`). Was OPEN, found 2026-11-03 (plan 102 Deck block R1).**
  A covered answer shows a caption (D140 call 14) until its cover is opened. Owes **P103-COVERED-NOTES-01**; old build `workshop:test-evidence/plan103-P103-M-COVERED-NOTES.json`. [Detail](roadmap-kb-details.md#plan-103-end-audit-k9-notes-moved-from-the-knowledge-base-roadmap-2026-11-10)
- ★★ `[KB]` `[ui]` **Up from a checklist's step 1 lands on the Copy reply text icon, and Down from that icon skips the whole step list and lands on Mark reply helpful** — **VERIFY, fixed 2026-11-10 (plan 103 lane F1, `152a1468`, `87a1ec46`). Was OPEN, found 2026-11-03 (plan 102 Deck block R0).**
  Down from the Copy icon reaches step 1; Up from step 1 goes back into the answer. Owes **P103-CHECKLIST-COPY-01** (block D2); old build `workshop:test-evidence/plan103-P103-M-CHECKLIST.json`. [Detail](roadmap-kb-details.md#plan-103-end-audit-k9-notes-moved-from-the-knowledge-base-roadmap-2026-11-10)
- ★★★ `[KB]` **Mod basics tips: 18 tips about managers, loaders, paths, backups and anti-cheat** — **VERIFY, landed 2026-11-09 (plan 103 lane G1; `41c88a4a`, `229c5019`, `4a894cc8`, `03596470`).**
  Tips 168 to 185 (topic "mods") and 36 test questions in `tests/fixtures/kb_eval/p103-mods.json`. Owes **P103-MODS-TIPS-01** on the Deck. [Detail](roadmap-kb-details.md#plan-103-end-audit-k9-notes-moved-from-the-knowledge-base-roadmap-2026-11-10)

**The last rewrite of the notes, and its cost (2026-11-10, sweep K10).** A last-morning re-check of the twelve notes files changed after their fact check found the facts held (about three dozen small corrections). Fallout 4, Red Dead Redemption 2 and Cyberpunk 2077 had never had the "own words" pass, and several files rested lines on the games' own text, which a wiki's licence does not cover. Four files were rewritten from fact lists (Fallout 4, Red Dead Redemption 2, Cyberpunk 2077, Melee), seven got small fixes, every one of the 21 new notes files' quotes was sorted by where it sits on its saved page, and a fact check by helpers who did not write the text followed. The search test over all 1,558 questions (right note in the first three): 1,332 before the rewrite, 1,325 after (10 lost, 3 gained: Cyberpunk 2077 four, Fallout 4, Left 4 Dead 2 and Red Dead Redemption 2 one each, three older questions). Report `workshop:archive/research/kb-embed-bakeoff-2026-11-10-arms-p103-final.md` (before: `-p103-v3-final.md`). **Left thin on purpose:** three Cyberpunk notes have two lines each (enemies with reflex boosters, enemy netrunners, robots); the Tomahawk note cannot say "throwing axe". **Left open:** two Cyberpunk gang pages (Tyger Claws, Maelstrom) are laid out like a page the wiki flags as copied from a book but carry no such flag, and their notes were kept; about twenty "Weak points" lines across older and new files may hold no weakness; the twelve older notes files from plans 100 and 102 have never had their quotes sorted this way.

## Plan 103 sweep K11 notes moved from the knowledge-base roadmap (2026-11-10)

Moved word for word by the last sweep, to make room for the results of Deck blocks D2 (third part), D3 and DR. Each paragraph names the entry it stood in.

**strip:**

**Deck 2026-11-10 (block D2):** Down from "Hide details" lands on the strip 3 of 3 with no notes line and the notes line then the strip 3 of 3 with one, also with a game running; Right moves the chips; B closes with the ring on "Show details". The page never lost focus (about 95 reads in parts one and two, about 125 across all of block D2), so the out-of-focus half is still tests only. Not run: two fresh chats, an older answer, a covered answer. Row **P103-DETAILS-STRIP-01** stays owed for those (`workshop:test-evidence/plan103-P103-DETAILS-STRIP-01.json`, `-try2.json`). [Detail](roadmap-kb-details.md#plan-103-end-audit-k9-notes-moved-from-the-knowledge-base-roadmap-2026-11-10)

**undo:**

Landed 2026-11-02; UNCLEAR on the Deck 2026-11-03 (`workshop:test-evidence/plan102-P102-UNDO-FOCUS-01.json`); NOT REPRODUCIBLE 2026-11-09, six times of six (`workshop:test-evidence/plan103-P102-UNDO-FOCUS-01-try2.json`).

**chips:**

On this PC, thirty questions in six games: a chip about the subject among the first three 12 of 90 before, 33 of 90 after (`workshop:archive/research/2026-11-10-p103-c1-chip-order-thirty-questions.md`). **A limit:** after the first deal the screen's rotation picks at random (Calls).

**crowd:**

**Final (2026-11-10, lanes R1b and X2):** on 891 notes the crowding grew (572 of 628 in the first three, 581 before). The fix loses 23 questions on the plugin's own search and gains 16, so it stayed turned down; the trade is yours (Calls). Record `workshop:archive/research/kb-crowding-fix-2026-11-10-p103-r1b.md`.

**mods:**

**Landed 2026-11-09 (plan 103):** 18 basics tips (lane G1), CC0 sources through the checks (lane T3); the device side stays plan 101's.

**chips (the per-game reads, as they stood in the entry):**

Deep Rock Galactic: Survivor: the first chip read "How do I beat Dreadnought Twins?" two seconds after the answer, but it had also shown before the question. Hollow Knight: no Broken Vessel chip in any read before the question; "How do I beat Broken Vessel?" appeared about twelve seconds after the answer. In Speed mode the chips did not follow the question, as built.

**versus (as it stood in the entry):**

renamed four versus notes (new names in the Detail) and lets the note a question names by title lead a mode note: the right note attaches for 115 of 140 asks (112 before). Three points open (Bugs).

**Deck header, the put-back paragraph (as it stood in the entry):**

**The Deck is put back (block DR, `workshop:test-evidence/plan103-P103-DR-RESTORE.json`):** the published library 2026.10.25 is back (3,145,728 bytes, by Remove then Download); the two chats the test drivers grew were deleted, four are left (the short test chat and your three); the mode chip is on Speed; "Show Developer tab" is off; no settings key differs from the 9 November backup (names compared, no values read); the quick-start line shows again on the Main tab; the keep-awake hold is released; no game is running and the AI is unloaded. **Not as on 9 November:** the new plugin build stays on the Deck; a settings backup file from this plan and one from plan 102 sit in its home folder; the short test chat exists.

**screenshot entry, the picture guess numbers (as it stood):**

The picture's own guess for the note search (lane P2) landed switched off (call 10): on the four pictures that name a note, 17 right notes with the starter picture model's guess and 4 with `qwen3.5:4b`, against 0 without.

**phase 5 entry, the own-words pass (as it stood):**

**House "own words" pass:** eight files rewritten, no fact changed (the lessons file).

**phase 8 entry, the count (as it stood):**

**As of 2026-11-10:** the build on this PC has 38 games and 583 notes; the source holds 891.
