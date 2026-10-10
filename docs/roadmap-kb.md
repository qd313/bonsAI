# bonsAI Roadmap: knowledge base and RAG

What this file holds: everything about the game notes and the search that feeds them, with its bugs, its owed Deck
checks and its plans together, so you can open one file and pick up where you left off. The rest of the roadmap is in
[roadmap.md](roadmap.md). The long notes for these entries are in [roadmap-kb-details.md](roadmap-kb-details.md). The
zoomed-out picture, what each next step buys a person and rough costs: [the status report](planning/37-rag-status-report.md).
Same house rules as the roadmap (five lines an entry, stars ascending in each list, the status words, a fix moves to
**Deck check owed** and then to Done in the same commit): [house rules](roadmap.md#house-rules-for-this-file).

## Knowledge base and RAG

Architecture: [knowledge-base.md](knowledge-base.md). The agreed answer-quality work: [plan 30](planning/30-kb-answer-quality-plan.md).

**Where things stand (2026-10-03).** The library on the Deck and on both download sites is 2026.09.26: 38 games, 414
notes, 164 Deck tips (published 2026-09-27, checked on the Deck, its copy matching byte for byte). Search puts the right
note in the top three 85.3 times in a hundred on questions nobody tuned against, measured 2026-09-18 on the older library.
The Deck's own model keeps the note's facts 79.5 times in a hundred with the answer-first shape that shipped (2026-09-07). Do not compare either with figures from before wave
three: both checks had faults. [Wave three's report](archive/48-kb-wave-three-session.md). More detail:
[blind questions](roadmap-kb-details.md#blind-questions-done), [the three new games](roadmap-kb-details.md#three-new-games-and-their-notes).

**Still short:** getting to the troubleshooting tips. Of 24 fresh plain sentences, 6 reached a tip before the tip rewrite
and 8 after.

**The one-second wait on every question is explained.** The Deck holds one model in memory at a time, so the answering
model and the note-search model push each other out. With the limit raised to two, a search after an answer dropped from
732 to 24 thousandths of a second (2026-09-12, `docs/test-evidence/plan48-R6-deck-model-eviction.json`). The maintainer's
Deck runs with two models kept loaded since 2026-09-23 (`docs/test-evidence/plan64-FOLLOWUP-MEMORY-EVICTION.json`); the
drift from August to September is still open. Two models beside a running game was measured 2026-09-26 and the safety
check stays unbuilt: [detail](roadmap-details.md#cost-to-a-running-game-second-sighting).

## Calls waiting on you

- **A card named after a category outranks the cards inside it** — **OPEN, raised 2026-08-31 (D41).** Kept open on
  purpose; the first step is to measure the shipping search question by question, so it is not yet a call to answer.
  [D41](audit/maintainer-decisions-locked.md#d41--open-raised-2026-08-31--a-card-named-after-a-category-outranks-the-cards-inside-it)

A new call lands here, one line, with what it decides. Every call already made is
written up in full in [the locked decisions file](audit/maintainer-decisions-locked.md).

## Bugs

- ★ `[KB]` **In Speed mode, the meaning check on troubleshooting tips never runs** — **ACCEPTED, 2026-09-28.** The
  maintainer chose this on 2026-09-05 to save about a second per Speed question
  ([D62](audit/maintainer-decisions-archive.md#d62--locked-2026-09-05-raised-2026-09-05--the-second-bug-fixing-session-four-calls-before-go)
  item 2). A stray word match can attach a wrong tip. A fix would run the meaning search only when the word hits are thin;
  that needs a cut-off picked and measured. [Detail](roadmap-kb-details.md#speed-mode-tip-gap)
- ★★ `[KB]` **A troubleshooting question that only describes the symptom reaches no tips** — **ACCEPTED, held back
  2026-09-06 (D81).** "The game drops me back to the library" reaches no crash tip, because the tip search needs a topic
  word. The held fix (a meaning search) attached wrong tips, six measured. The tips were rewritten and a "none of these
  fit" floor now exists, but the held fix has not been re-measured with it. Overlaps the entry of the same subject in
  Next. [Detail](roadmap-kb-details.md#a-troubleshooting-question-that-only-describes-the-symptom-reaches-no-tips)
- ★★ `[KB]` **Questions with no real answer in the notes can still get notes about the wrong subject (Portal 2 house buying, a Hades boss that does not exist)** — **OPEN, found 2026-09-07, seen again 2026-09-26; not retried on 2026-10-03.**
  The Black Mesa horse question is fixed: it shows the "No close match" line since `2abaa0ae` (passed on the Deck 2026-10-03, `docs/test-evidence/plan81-P81-KB-NOTES-FIRST.json`). A Portal 2 house-buying question and a Hades boss that does not exist can still bring up notes about something else, and the reply follows them. Catching these in general still costs twenty or more right answers elsewhere.
  [Detail](roadmap-kb-details.md#wrong-subject-notes)
- ★★ `[KB]` **Unrelated questions can still get a game card stapled on** — **ACCEPTED 2026-08-27.** With a game running,
  "thank you very much" still attached a card on the Deck on 2026-08-23. Raising the word floor costs real matches and the
  model mostly ignores a card that does not fit. Later floors (2026-09) may have cured some phrases; no Deck re-run since.
  [D28](audit/maintainer-decisions-archive.md#d28--ordinary-phrases-attach-game-cards-how-hard-should-the-floor-be) ·
  [Detail](roadmap-kb-details.md#ordinary-phrases-attach-game-cards)
- ★★★★ `[KB]` **What ships loses to its own meaning half on questions nobody tuned against** — **ACCEPTED, decided
  2026-09-06.** Leaning the search toward meaning finds the right note first a little more often, but it would bury a new
  note with no meaning index yet. That reason is gone since 2026-09-07 (every note is now guaranteed an index), but two
  other objections stand, and nothing has been re-measured on the bigger library. Weights stay even. [D82](audit/maintainer-decisions-locked.md#d82--open-raised-2026-09-06--leaning-the-search-on-meaning-wins-on-the-measurements-and-breaks-three-rules-we-set-on-purpose) · [Detail](roadmap-kb-details.md#the-shipping-retrieval-arm-loses-to-the-vector-half-alone-on-rows-nobody-tuned-against)

## Deck check owed

- ★ `[KB]` **An answer showed "No close match in my notes" while the plugin log says notes were attached** — **VERIFY, fixed 2026-10-10 (plan 87 K1, `4deec915` screen, `0ce3bbd0` log line). Was OPEN, found 2026-10-08 on the Deck (plan 83 overnight, build `0d3af3de`).**
  The log's "attached N chars" is the real notes text, so notes were attached on 2026-10-08. The "No close match" line is added when the attached notes were a weak match, and the notes block lists only notes the answer repeated. On the horse question the answer used none, so the line was true and no block showed. A real contradiction was found in saved chats (the line and the block under the same answer, when the answer did use a note): fixed, the screen now takes the line off an answer that used a note (copy text and Read aloud too; the saved chat keeps the full text). The plugin log now names which notes were attached and which footer line was added.
  Tests: `src/components/MainTabChatTranscript.closeMatchLine.test.tsx` (7, three fail without the fix), `src/utils/kbCloseMatchLineAgrees.test.ts` (5), `tests/test_kb_attach_log_line.py` (5). Original find: `docs/test-evidence/plan83-NOTES-BLOCK-04-game.json`, try 1.
  Deck check owed: the covered-game-running half of **NOTES-BLOCK-04**, plus new row **P87-K1-LINE-AND-BLOCK**.
- ★★ `[KB]` **Hidden spoiler box stays shut on games with no Steam ID and on name-first questions** — **VERIFY, landed
  2026-09-15, unit-tested.** A game known only by name now opens its box, and naming the boss up front keeps the answer in
  plain text. Passed on the Deck: name-first (STRAT-SPOIL-FIRST-01, 2026-09-18), knowledge base off (DRG-01b, 2026-09-23) and library absent (DRG-01c, 2026-10-03; the AI wrote no hidden block, so a cover was not tested directly).
  **Still owed:** STRAT-SPOIL-NAME-01 could not run four times, last 2026-10-02: none of its games is on Recent Games. It needs the maintainer to start one of the four games once by hand so it shows there (no prepared setup can do that); it is on the checks page.
  Evidence `docs/test-evidence/plan79-STRAT-SPOIL-NAME-01.json`. [Detail](roadmap-kb-details.md#hidden-spoiler-box-stays-shut-on-games-with-no-steam-id-and-on-name-first-questions)
- ★★ `[KB]` **The note's own words under the reply** — **VERIFY, fixed and re-run 2026-09-19 and 2026-09-26.** Most
  rows passed on the Deck and are closed: 01, 02, 03, 05, 06 and TEN-GAMES-01; 04's "no block" half passed 2026-10-03
  (`docs/test-evidence/plan81-NOTES-BLOCK-04.json`). **Still owed:** 04's covered-game-running half (2026-10-03: the Black Mesa horse question showed the "No close match" line with no notes listed, `docs/test-evidence/plan81-P81-KB-NOTES-FIRST.json`, but with no game running; 2026-10-08, game running: UNCLEAR, both tries attached notes (1042 and 1242 characters), so a reply with nothing attached never came up, `docs/test-evidence/plan83-NOTES-BLOCK-04-game.json`), NOTES-BLOCK-07 (needs a person
  listening to confirm the block is never read aloud) and NOTES-BLOCK-LADDER (no block has had a chip ladder to test;
  retiring that half is the maintainer's call). Rows in [testing-manual.md](testing-manual.md). **2026-10-10 (plan 87 K1):** a fix for the "No close match" line appearing beside a notes block landed; 04's covered-game-running half and new row P87-K1-LINE-AND-BLOCK stay owed on the Deck.

## Next

- ★ `[KB]` **Measure answers with the character voice on** — **OPEN, switch built.** The answer test can run with the
  character voice on (since 2026-09-06). No run with it on has been saved. One run is owed. Plan 48 planned it but its
  report ([48](archive/48-kb-wave-three-session.md) § 7) has no voice results.
- ★ `[KB]` **Retire the Developer tab's "Install seed knowledge base" button** — **OPEN, an idea from the maintainer
  2026-10-02.** It was a stand-in from before the library was published, and its text still says the public download "is
  not live yet". Several Deck focus walks use it as the first stop on the tab, so check those first.
- ★★ `[KB]` **The eval cannot yet prove the meaning search rescues many questions** — **OPEN, one measurement owed.** The
  questions the word search cannot answer at all numbered 3 when last counted, before 36 more blind rows landed. Re-count
  on the next search run. No code needed.
  [Detail](roadmap-kb-details.md#eval-fixture-cannot-see-a-recall-failure)
- ★★★ `[KB]` **Card style pass** — **OPEN, measure first, added 2026-09-05.** Rewrite the prose cards as labelled short
  lines, the shape the labelled cards already use (how many cards are labelled needs a recount). Facts kept was 92% when
  measured, so the ceiling is low. Do it only if the answer test shows the labelled shape scores better.
  ([D67](audit/maintainer-decisions-archive.md#d67--locked-2026-09-05--structured-cards-accept-prose))
- ★★★ `[KB]` **Deeper answer checks** — **OPEN, added 2026-09-05.** The answer test cannot tell whether a reply was
  helpful or whether the model admitted not knowing. Add questions no card can answer, scored for an honest "I don't
  know", and a monthly read of ten replies by a person. **Sighting 2026-09-26:** a plain tip ("raise Render Scale") became
  advice that contradicts itself. [Detail](roadmap-kb-details.md#flow-l7-findings)
- ★★★ `[KB]` **KB visual maps** — **OPEN.** Two shapes you named 2026-08-29: a dungeon map, and a boss outline with weak
  points marked. Nothing draws anything in a reply today. A dungeon map has to be authored, which sits behind the source
  policy and a corpus rebuild. Research first. [Detail](roadmap-kb-details.md#kb-visual-maps)
- ★★★ `[KB]` **Spoiler coverage as a tiered setting** — **OPEN, tiers confirmed 2026-09-01
  ([D50](audit/maintainer-decisions-archive.md#d50--locked-2026-09-01--spoiler-tiers-confirmed)).** Strict fences bosses,
  endings and chapters. Default fences only named story beats and endings. Open fences nothing you asked about. Naming a
  boss still unlocks it in every tier. About three days, plus Deck QA.
  [Detail](roadmap-kb-details.md#spoiler-coverage-should-be-a-setting-with-tiers) · [Fencing](roadmap-kb-details.md#user-adjustable-spoiler-fencing-absorbed-into-the-tiered-setting)
- ★★★ `[KB]` **A troubleshooting question mostly never reaches the tips** — **OPEN, widened 2026-09-07.** Nine of ten
  ordinary problem sentences ("my game keeps crashing") reached nothing when measured 2026-09-07, because the word "crash"
  alone is too weak to route a question. The tip cut-off and a false word match were fixed 2026-09-26, and the "no tip for
  this" line was retired 2026-09-27. Not remeasured since. (D81, D85)
  [Detail](roadmap-kb-details.md#a-troubleshooting-question-mostly-never-reaches-the-tips)
- ★★★★ `[KB]` **KB online / versus strategy content** — **OPEN, discovery locked 2026-08-09.** Multiplayer questions
  (roles, callouts, co-op) get nothing specific today. Plan: new card kinds, Left 4 Dead 2 first, then Counter-Strike 2,
  from archive dumps only. Two to three weeks. [Plan](planning/17-kb-online-versus-strategy-content.md) ·
  [Detail](roadmap-kb-details.md#kb-online--versus-strategy-content-and-rag-phase-5)
- ★★★★ `[KB]` `[QA]` **Measure how well the AI reads a screenshot: which game, which area, which boss** — **OPEN, added
  2026-09-25.** Never measured. First build a scored set of real Deck screenshots and run it on each picture model the
  Deck offers. Then fix where it fails.
  [Detail](roadmap-kb-details.md#measure-how-well-the-ai-reads-a-screenshot)
- ★★★★ `[KB]` **RAG Phase 4: extended retrieval** — **PARTIAL.** Chips that show the library exists and the labelled enemy
  and item cards shipped ([D67](audit/maintainer-decisions-archive.md#d67--locked-2026-09-05--structured-cards-accept-prose)).
  A running game's own tip passed on the Deck 2026-09-26. The chip promise passed on the Deck 2026-10-01 (P78-TIP-CHIP,
  P78-CHIP-PACE). Still owed: the look at the widest chip labels (PHASE4-CHIPS-01) and the maintainer's own look at the
  pace. [Detail](roadmap-kb-details.md#rag-phase-4-extended-retrieval)
- ★★★★ `[KB]` **RAG Phase 5: depth on the thirteen titles** — **PARTIAL.** The thirteen original titles went from 133 to
  164 notes. Four still have no enemy or item notes: Baldur's Gate 3, GTA San Andreas, The Sims 4 and Portal 2 (counted
  2026-10-03). Next: 40 to 60 enemy and item notes in batches, with a quality read from you after the first.
  [Plan](planning/28-phase5-corpus-depth.md)
- ★★★★ `[KB]` **RAG Phase 7: retrieval infrastructure** — **OPEN.** What still matters: a thumbs-down that stops a wrong
  note coming back (three days), add-on packs before a large catalog (five days or more), a screenshot feeding the search.
  **Design C chosen 2026-09-27
  ([D112](audit/maintainer-decisions-locked.md#d112--locked-2026-09-25-raised-2026-09-25--plan-70-knowledge-base-wave-four-with-an-automated-deck-test-wave-the-twelve-calls-before-go)):**
  "Not really" opens the reason chips, plus a "which note?" row when two or three notes were used. Not built. [Detail](roadmap-kb-details.md#rag-phase-7-community-tip-contribution-rag-phase-8) · [Drawing](https://claude.ai/artifact/K2MXtVYoEYV6cNxsAzUh43)
- ★★★★★ `[KB]` **Community tip contribution** — **OPEN, unblocked.** A reader turns a good reply into a proposed note
  with one press. **Suggest as a tip** writes a valid card to the Desktop plus a GitHub attach link. Three to five days.
  [Detail](roadmap-kb-details.md#rag-phase-7-community-tip-contribution-rag-phase-8)
- ★★★★★★ `[KB]` **RAG Phase 8: catalog corpus** — **OPEN, intent only.** The change that gets most people's games real
  notes instead of the model's memory: top 1000 Steam titles, top 100 on Deck, an emulated slice. Months of work.
  **As of 2026-10-03:** the source study is done, and the library is at 38 games and 414 notes
  ([D111](audit/maintainer-decisions-locked.md#d111--locked-2026-09-17-raised-2026-09-17--58-phase-1-the-notes-own-words-on-screen-and-wiki-notes-taken-without-rewriting--nine-calls-before-the-build)).
  [Detail](roadmap-kb-details.md#rag-phase-8-catalog-corpus)
