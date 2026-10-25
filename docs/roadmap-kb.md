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
three: both checks had faults. [Wave three's report](../../bonsAI-workshop/archive/48-kb-wave-three-session.md). More detail:
[blind questions](roadmap-kb-details.md#blind-questions-done), [the three new games](roadmap-kb-details.md#three-new-games-and-their-notes).

**Still short:** getting to the troubleshooting tips. Of 24 fresh plain sentences, 6 reached a tip before the tip rewrite
and 8 after (still 8 when measured again 2026-10-24).

**The one-second wait on every question is explained:** the Deck holds one model at a time, so the answering and note-search models push each other out; with the limit at two, a search after an answer dropped from 732 to 24 thousandths of a second. The maintainer's Deck keeps two loaded since 2026-09-23. Full text and evidence: [detail](roadmap-kb-details.md#plan-98-notes-moved-from-the-knowledge-base-roadmap-2026-10-24).

## Calls waiting on you

- **A card named after a category outranks the cards inside it** — **OPEN, raised 2026-08-31 (D41).** Kept open on
  purpose; the first step is to measure the shipping search question by question, so it is not yet a call to answer.
  **Measured 2026-10-24 (plan 98 lane F):** a category note came first in 3 of 279 questions (about 1 in 100); only one fits this entry. D41 stays your call. Word for word: [Detail](roadmap-kb-details.md#plan-98-notes-moved-from-the-knowledge-base-roadmap-2026-10-24)
  [D41](audit/maintainer-decisions-locked.md#d41--open-raised-2026-08-31--a-card-named-after-a-category-outranks-the-cards-inside-it)

A new call lands here, one line, with what it decides. Every call already made is
written up in full in [the locked decisions file](audit/maintainer-decisions-locked.md).

## Bugs

- ★ `[KB]` **A notes card ("From bonsAI's own note") was drawn under an answer with the knowledge library switch OFF** — **ACCEPTED, by design: the maintainer's call 2026-10-18 ("That's fine"); found 2026-10-18 (plan 96 block M, Deck).**
  A stopped answer with "Use local knowledge base" off still drew a notes card once, and not on another try. The maintainer's call: that is fine (by design). Evidence `workshop:test-evidence/plan96-P96-R2-STOP-NOCARD-2.json`.
- ★★ `[KB]` **Story spoilers: Hide more drew fewer spoiler covers than Default on the PC answer test** — **OPEN, found 2026-10-24 (plan 98 consult 5).**
  23 covers in 100 answers against 29, and twice it missed a Hades story cover that Default kept 3 of 3. One run, not yet understood. Evidence `workshop:archive/research/kb-answer-eval-2026-10-24-p98b-strict.md` against `workshop:archive/research/kb-answer-eval-2026-10-24-p98b-default.md`.
- ★★ `[KB]` **ui: in a second checklist answer, the route's steps were drawn but the D-pad could not reach them** — **OPEN, found 2026-10-24 (plan 98 Deck block KR).**
  The ring went to the tab bar. One sighting, with a muddled setup (the answer came from an old branch button). Evidence `workshop:test-evidence/plan98-P98-KR-REPLAYS.json` (the P98-ROUTE-01 line).
- ★ `[KB]` **measure: on a made-up question, three weak notes attach with a keyword score of 0.00 every time** — **OPEN, found 2026-10-24 (plan 98 consult 5).**
  Should a question with no keyword support attach nothing? A measurement against the right-note questions comes first; no right note may be lost. Evidence `workshop:test-evidence/plan98-P98-NOTES-BLOCK-04.json`.
- ★ `[KB]` **A thank-you or a junk phrase is treated as a follow-up to the previous question** — **OPEN, found 2026-10-24 (plan 98 block K0, Deck).**
  A short question with "it" and no subject counts as a follow-up, so "thank you very much" answered the previous question again (the earlier house question) instead of a short reply, and the "what time is it" reading is muddied the same way. A clean re-run in a fresh chat is owed. Evidence `workshop:test-evidence/plan98-P98-JUNK-PHRASES.json`.
- ★ `[KB]` **A "where am I stuck" answer for Hollow Knight added an "If you want to cheat" section** — **OPEN, found 2026-10-24 (plan 98 Deck block K3).**
  The route answer suggested emulator and fast-travel exploits. Odd advice from the AI, seen once. Evidence `workshop:test-evidence/plan98-P98-ROUTE-01-try2.json`.
- ★ `[KB]` **In Speed mode, the meaning check on troubleshooting tips never runs** — **ACCEPTED, 2026-09-28.** The
  maintainer chose this on 2026-09-05 to save about a second per Speed question
  ([D62](audit/maintainer-decisions-archive.md#d62--locked-2026-09-05-raised-2026-09-05--the-second-bug-fixing-session-four-calls-before-go)
  item 2). A stray word match can attach a wrong tip. A fix would run the meaning search only when the word hits are thin;
  that needs a cut-off picked and measured. [Detail](roadmap-kb-details.md#speed-mode-tip-gap)
- ★ `[KB]` **Route look: the shown steps are forgotten when the cache is cleared** — **OPEN, found 2026-10-24 (plan 98 lane H).**
  The steps already shown are kept in the panel's browser storage, not beside the ticks in the back end's per-game save. Clear cache and leaving Strategy forget them; Clear all data does too.
- ★ `[KB]` **Route look: no "Needs: …" part is written for steps that need an item or ability** — **OPEN, found 2026-10-24 (plan 98 lane H).**
  The screen already draws a "Needs" part when a step has one; the AI is never asked to add it. Ask it to, for a step that needs an item or ability first.
- ★ `[KB]` **Story spoilers: the Search tab's entry lands on the section line, not on the new row** — **OPEN, found 2026-10-24 (plan 98 lane B).**
  Searching for "Story spoilers" opens the section but not the "How much to hide" row.
- ★ `[KB]` **Story spoilers: under Hide less the answer test's no-contradiction rate read 90.7%, against 100%** — **OPEN, found 2026-10-24 (plan 98 lane B).**
  One run (`workshop:archive/research/kb-answer-eval-2026-10-24-p98b-open.md`); not investigated.
- ★ `[KB]` **Thumbs-down: "ranked lower by you" stays on an answer already saved after Undo** — **OPEN, found 2026-10-24 (plan 98 lane D).**
  Show details' tag is as of the ask, so an Undo does not clear it on an answer already saved.
- ★★ `[KB]` **Thumbs-down: after Undo with a game running, Down stopped on the notes block** — **OPEN, found 2026-10-24 (plan 98 Deck block K3).**
  The page had lost the window's focus (the lost-focus family from plan 97), so Down did nothing. Closing and reopening Quick Access cleared it but emptied the question box. Same lost-focus family as plan 97's freeze; the only cure, closing and reopening Quick Access, emptied the question box. Evidence `workshop:test-evidence/plan98-P98-DEMOTE-01-game.json`.
- ★ `[KB]` **Yoshi's Story's "Starting out" note contradicts itself about its levels** — **OPEN, found 2026-10-24 (plan 98 lane G3).**
  The note (section 376 in `data/kb/strategy_seed.json`) says "24 levels split across four worlds of six pages" and also "only six levels are played in any one run". The real game has six worlds of four levels. Lane G3 kept those numbers out of the glossary words. The note needs correcting, then a library rebuild.
- ★★ `[KB]` **A troubleshooting question that only describes the symptom reaches no tips** — **ACCEPTED, held back
  2026-09-06 (D81).** "The game drops me back to the library" reaches no crash tip, because the tip search needs a topic
  word. The held fix (a meaning search) attached wrong tips, six measured. The tips were rewritten and a "none of these
  fit" floor now exists. Re-measured 2026-10-24 (plan 98 lane F, `workshop:archive/research/kb-embed-bakeoff-2026-10-24-arms.md`): today 8 of 24 plain problem sentences reach a tip; the held branch reaches all 24 but gets only 13 right, so it stays held. Overlaps the entry of the same subject in
  Next. [Detail](roadmap-kb-details.md#a-troubleshooting-question-that-only-describes-the-symptom-reaches-no-tips)
  **Second opinion 2026-10-24 (plan 98 consult 2):** no score cut-off is worth building (two are already on). The fix is wording, written up in the Next entry "A troubleshooting question mostly never reaches the tips".
- ★★ `[KB]` **Unrelated questions can still get a game card stapled on** — **ACCEPTED 2026-08-27.** With a game running,
  "thank you very much" still attached a card on the Deck on 2026-08-23. Raising the word floor costs real matches and the
  model mostly ignores a card that does not fit. Later floors (2026-09) may have cured some phrases.
  **Deck 2026-10-24 (plan 98 block K0), MEASURED:** "thank you very much" attached no notes; "what time is it" still attached three. A clean re-run in a fresh chat is owed (`workshop:test-evidence/plan98-P98-JUNK-PHRASES.json`). Word for word: [Detail](roadmap-kb-details.md#plan-98-notes-moved-from-the-knowledge-base-roadmap-2026-10-24)
  [D28](audit/maintainer-decisions-archive.md#d28--ordinary-phrases-attach-game-cards-how-hard-should-the-floor-be) ·
  [Detail](roadmap-kb-details.md#ordinary-phrases-attach-game-cards)
- ★★ `[KB]` **Story spoilers: under Hide more, a cover with no boss name in it still opens on a game with no story profile** — **OPEN, found 2026-10-24 (plan 98 lane B).**
  On screen, covers on a no-story game are opened unless they name a protected note, so the tier is not on the screen side.
- ★★ `[KB]` `[QA]` **Screenshot reading ignores the game name it was handed** — **OPEN, found 2026-10-24 (plan 98 lane I).**
  On God of War's play and pause pictures the Deck's AI ignored the handed-over game name in 4 of 9 asks. See the screenshot entry in Next.
- ★★ `[KB]` **Thumbs-down: Undo shows only on the newest answer, so an older mark has no way back** — **OPEN, found 2026-10-24 (plan 98 Deck block K1).**
  Once another question is asked, an earlier answer shows no rating row and no Undo. Three marks leave a note out of the answers for good, with nothing on screen to see or clear it. A place to see and clear lowered notes is needed (Show details' tag, or a Settings row). Evidence `workshop:test-evidence/plan98-P98-DEMOTE-01.json`.
- ★★★★ `[KB]` **What ships loses to its own meaning half on questions nobody tuned against** — **ACCEPTED, decided
  2026-09-06.** Leaning the search toward meaning finds the right note first a little more often, but it would bury a new
  note with no meaning index yet. That reason is gone since 2026-09-07 (every note is now guaranteed an index), but two
  other objections stand, and nothing has been re-measured on the bigger library. Weights stay even. [D82](audit/maintainer-decisions-locked.md#d82--open-raised-2026-09-06--leaning-the-search-on-meaning-wins-on-the-measurements-and-breaks-three-rules-we-set-on-purpose) · [Detail](roadmap-kb-details.md#the-shipping-retrieval-arm-loses-to-the-vector-half-alone-on-rows-nobody-tuned-against)

## Deck check owed

- ★ `[KB]` **Too many underlined words in one answer: each glossary word is now underlined only the first time** — **PASSED on the Deck 2026-10-25 (block KS, build `87a21fa1`; landed `c938e643`); to move to Done in the next docs sweep. Asked for by the maintainer 2026-10-25 (the checks page: "Only show the underline on the first instance of the keyword").**
  A Hollow Knight answer underlined 11 words; it now underlines 5 (Mothwing Cloak, Charms, notches, bench, Geo), counting "charm" and "charms" as one word, across every section of the answer and while it streams. Words inside a spoiler block count on their own. Proven by 9 tests.
  Deck (row **P98-GLOSSARY-FIRST-01**): the same question gave a new answer with 7 underlines for 7 words, none twice ("notches" underlined once of three); Down visits the question, the answer, then the 7, all fully visible. Evidence `workshop:test-evidence/plan98-P98-GLOSSARY-FIRST-01.json` and its pictures. Saved walks over answers that repeat a library word may now have fewer stops.
- ★★ `[KB]` **Hidden spoiler box stays shut on games with no Steam ID and on name-first questions** — **VERIFY, landed
  2026-09-15, unit-tested.** A game known only by name now opens its box, and naming the boss up front keeps the answer in
  plain text. Passed on the Deck: name-first (STRAT-SPOIL-FIRST-01, 2026-09-18), knowledge base off (DRG-01b, 2026-09-23) and library absent (DRG-01c, 2026-10-03; the AI wrote no hidden block, so a cover was not tested directly).
  **Still owed:** STRAT-SPOIL-NAME-01 could not run five times, last 2026-10-24: the three non-Steam games cannot be launched by the rig, so the maintainer's hand launch is needed (on the checks page). Word for word: [Detail](roadmap-kb-details.md#plan-98-notes-moved-from-the-knowledge-base-roadmap-2026-10-24)
  Evidence `workshop:test-evidence/plan79-STRAT-SPOIL-NAME-01.json`. [Detail](roadmap-kb-details.md#hidden-spoiler-box-stays-shut-on-games-with-no-steam-id-and-on-name-first-questions)

## Next

- ★★ `[KB]` **The eval cannot yet prove the meaning search rescues many questions** — **OPEN, counted 2026-10-24 (plan 98 lane F).** Only 4 labelled questions get nothing from the word search, too few to gate a regression; whether to write more is the owner's call. No code needed. Figures: [Detail](roadmap-kb-details.md#plan-98-notes-moved-from-the-knowledge-base-roadmap-2026-10-24)
  [Detail](roadmap-kb-details.md#eval-fixture-cannot-see-a-recall-failure)
- ★★★ `[KB]` **Card style pass** — **OPEN, measure first, added 2026-09-05.** Rewrite the prose cards as labelled short
  lines, the shape the labelled cards already use (how many cards are labelled needs a recount). Facts kept was 92% when
  measured, so the ceiling is low. Do it only if the answer test shows the labelled shape scores better.
  ([D67](audit/maintainer-decisions-archive.md#d67--locked-2026-09-05--structured-cards-accept-prose))
- ★★★ `[KB]` **Deeper answer checks** — **OPEN, added 2026-09-05.** The answer test cannot tell whether a reply was
  helpful or whether the model admitted not knowing. Add questions no card can answer, scored for an honest "I don't
  know", and a monthly read of ten replies by a person. **Sighting 2026-09-26:** a plain tip ("raise Render Scale") became
  advice that contradicts itself. [Detail](roadmap-kb-details.md#flow-l7-findings)
- ★★★ `[KB]` **KB visual maps** — **OPEN; two shapes picked on the mock-up board 2026-10-10.** Nothing draws anything in a reply today.
  **A route, one step at a time:** built 2026-10-24 as the look of the strategy checklist (see the route-look entry in Deck check owed above). Still to come: a "Needs: …" part on steps that need an item or ability (see Bugs).
  **Your screenshot, marked**: up to three numbered marks (hit, avoid, dodge), each saying whether the Deck's AI is sure; an unsure mark is dashed. A scoring test first: a stronger model scores, out of ten, what the Deck's models mark, and helps teach them.
  Not chosen as drawn: a fuller boss card, a whole-kingdom map. An area map must look real; maps taken from the game or a wiki need a licence check first.
  [Mock-up board, tab 5](https://claude.ai/artifact/XyZfUSPGRZdm2P3mTGV9tR) · [notes](demos/mockup-board/README.md) · [Detail](roadmap-kb-details.md#kb-visual-maps)
- ★★★ `[KB]` **A troubleshooting question mostly never reaches the tips** — **OPEN, widened 2026-09-07.** Nine of ten
  ordinary problem sentences ("my game keeps crashing") reached nothing when measured 2026-09-07, because the word "crash"
  alone is too weak to route a question. The tip cut-off and a false word match were fixed 2026-09-26, and the "no tip for
  this" line was retired 2026-09-27. Remeasured 2026-10-24 (plan 98 lane F): 8 of 24 plain sentences reach a tip, 6 of them right; the held meaning-search branch reaches all 24 but gets only 13 right (see the symptom entry in Bugs). (D81, D85)
  **Second opinion 2026-10-24 (plan 98 consult 2): fix the wording in two places (five tips and the router's topic words), not a cut-off.** Two problems have no tip at all (sound to the TV instead of headphones; menus out of place on a TV), and the 24 test sentences need their right tips written into the fixture before any gate. The word lists: [Detail](roadmap-kb-details.md#plan-98-notes-moved-from-the-knowledge-base-roadmap-2026-10-24)
  [Detail](roadmap-kb-details.md#a-troubleshooting-question-mostly-never-reaches-the-tips)
- ★★★★ `[KB]` **KB online / versus strategy content** — **OPEN, discovery locked 2026-08-09.** Multiplayer questions
  (roles, callouts, co-op) get nothing specific today. Plan: new card kinds, Left 4 Dead 2 first, then Counter-Strike 2,
  from archive dumps only. Two to three weeks. [Plan](planning/17-kb-online-versus-strategy-content.md) ·
  [Detail](roadmap-kb-details.md#kb-online--versus-strategy-content-and-rag-phase-5)
- ★★★★ `[KB]` `[QA]` **Measure how well the AI reads a screenshot: which game, which area, which boss** — **PARTIAL, added 2026-09-25. Step 1 done 2026-10-24 (plan 98 lane I, `6e46b9fc` to `1219b07c`): a labelled picture set and a scoring script.**
  First figures (8 Deck pictures, the Deck's own model `gemma4:e2b-it-qat`, 3 tries each): with the game handed over it named the game 75 times in 100 and the area 42; with nothing handed over, 17 and 29. No picture had a boss. It often invents and guesses Zelda: Ocarina of Time for pictures it does not know. Full text: [Detail](roadmap-kb-details.md#plan-98-notes-moved-from-the-knowledge-base-roadmap-2026-10-24)
  The set is thin (most games stop at a save-slot screen the rig must not touch; Steam's overlay is on every picture); a bigger set with play scenes needs the maintainer's hand. **Step 2** (each picture model the Deck offers, then fix where it fails) is still open. Report `workshop:archive/research/screenshot-reading-2026-10-24.md`. Full text: [Detail](roadmap-kb-details.md#plan-98-notes-moved-from-the-knowledge-base-roadmap-2026-10-24)
  [Detail](roadmap-kb-details.md#measure-how-well-the-ai-reads-a-screenshot)
- ★★★★ `[KB]` **RAG Phase 4: extended retrieval** — **PARTIAL.** Chips that show the library exists and the labelled enemy
  and item cards shipped ([D67](audit/maintainer-decisions-archive.md#d67--locked-2026-09-05--structured-cards-accept-prose)).
  A running game's own tip passed on the Deck 2026-09-26. The chip promise passed on the Deck 2026-10-01 (P78-TIP-CHIP,
  P78-CHIP-PACE). Still owed: the look at the widest chip labels (PHASE4-CHIPS-01; UNCLEAR again 2026-10-24, see its testing row). The maintainer's own look at the
  pace is closed: "as they are", 2026-10-22 (plan 99 § 2 call 12). [Detail](roadmap-kb-details.md#rag-phase-4-extended-retrieval)
- ★★★★ `[KB]` **RAG Phase 5: depth on the thirteen titles** — **PARTIAL.** The thirteen original titles went from 133 to
  164 notes. Four still have no enemy or item notes: Baldur's Gate 3, GTA San Andreas, The Sims 4 and Portal 2 (counted
  2026-10-03). Next: 40 to 60 enemy and item notes in batches, with a quality read from you after the first.
  [Plan](planning/28-phase5-corpus-depth.md)
- ★★★★ `[KB]` **RAG Phase 7: retrieval infrastructure** — **PARTIAL.** What still matters: add-on packs before a large catalog, a screenshot feeding the search.
  **The thumbs-down that stops a wrong note coming back was built 2026-10-24** (design C, D112 item 8): see its entry in Deck check owed. [Detail](roadmap-kb-details.md#rag-phase-7-community-tip-contribution-rag-phase-8)
- ★★★★★ `[KB]` **Community tip contribution** — **OPEN, unblocked.** A reader turns a good reply into a proposed note
  with one press. **Suggest as a tip** writes a valid card to the Desktop plus a GitHub attach link. Three to five days.
  [Detail](roadmap-kb-details.md#rag-phase-7-community-tip-contribution-rag-phase-8)
- ★★★★★★ `[KB]` **RAG Phase 8: catalog corpus** — **OPEN, intent only.** The change that gets most people's games real
  notes instead of the model's memory: top 1000 Steam titles, top 100 on Deck, an emulated slice. Months of work.
  **As of 2026-10-03:** the source study is done, and the library is at 38 games and 414 notes
  ([D111](audit/maintainer-decisions-locked.md#d111--locked-2026-09-17-raised-2026-09-17--58-phase-1-the-notes-own-words-on-screen-and-wiki-notes-taken-without-rewriting--nine-calls-before-the-build)).
  [Detail](roadmap-kb-details.md#rag-phase-8-catalog-corpus)
