# bonsAI Roadmap: knowledge base and RAG

What this file holds: everything about the game notes and the search that feeds them, with its bugs, its owed Deck
checks and its plans together, so you can open one file and pick up where you left off. The rest of the roadmap is in
[roadmap.md](roadmap.md). The long notes for these entries are in [roadmap-kb-details.md](roadmap-kb-details.md). The
zoomed-out picture, what each next step buys a person and rough costs: [the status report](planning/37-rag-status-report.md).
Same house rules as the roadmap (five lines an entry, stars ascending in each list, the status words, a fix moves to
**Deck check owed** and then to Done in the same commit): [house rules](roadmap.md#house-rules-for-this-file).

## Knowledge base and RAG

Architecture: [knowledge-base.md](knowledge-base.md). The agreed answer-quality work: [plan 30](planning/30-kb-answer-quality-plan.md).

**Where things stand (2026-10-26).** The library people can download is 2026.10.25: 38 games, 414 notes, 164 Deck tips
and 351 tap-to-define words; the maintainer published it on 2026-10-25 and both channels were read back byte for byte
([the releases table](knowledge-base.md)). The build on this PC is bigger: 465 notes and 166 tips, because plan 100 added
51 notes for four games and two tips. It is not published yet; that waits for the maintainer. 29 of the 38 games now have enemy and item notes. The Deck's own copy is
2026.10.25 (`workshop:test-evidence/plan98-P98-KS-LIBRARY.json`).
Search puts the right
note in the top three 85.3 times in a hundred on questions nobody tuned against, measured 2026-09-18 on the older library.
The Deck's own model keeps the note's facts 79.5 times in a hundred with the answer-first shape that shipped (2026-09-07). Do not compare either with figures from before wave
three: both checks had faults. [Wave three's report](../../bonsAI-workshop/archive/48-kb-wave-three-session.md). More:
[blind questions](roadmap-kb-details.md#blind-questions-done), [the three new games](roadmap-kb-details.md#three-new-games-and-their-notes).

**Still short:** getting to the troubleshooting tips, though better since 2026-10-25. Of 24 fresh plain sentences, 8 reached a tip before the wording fix and 17 reach one now, none a wrong one (PC; Deck check owed).

**The one-second wait on every question is explained:** the Deck holds one model at a time, so the answering and note-search models push each other out. Full text and evidence: [detail](roadmap-kb-details.md#plan-98-notes-moved-from-the-knowledge-base-roadmap-2026-10-24).

## Calls waiting on you

- **A card named after a category outranks the cards inside it** — **OPEN, raised 2026-08-31 (D41).** Kept open on
  purpose.
  **Measured 2026-10-24 (plan 98 lane F):** a category note came first in 3 of 279 questions (about 1 in 100); only one fits this entry. D41 stays your call. Word for word: [Detail](roadmap-kb-details.md#plan-98-notes-moved-from-the-knowledge-base-roadmap-2026-10-24)
  [D41](audit/maintainer-decisions-locked.md#d41--open-raised-2026-08-31--a-card-named-after-a-category-outranks-the-cards-inside-it)

- **Hide more draws fewer spoiler covers than Default: close or keep?** — **OPEN, raised 2026-10-25 (plan 100 lane X).**
  Measured twice: 20.6 against 23.8 covers in a hundred, and no story cover missed. See the Bugs entry of that name.
- **Hide less read 94.4 percent clean on the second run: close or keep?** — **OPEN, raised 2026-10-25 (plan 100 lane X).**
  First run 90.7, second 94.4. See the Bugs entry "under Hide less".
- **A made-up question attaches three weak notes at a score of 0.00: close as "the No close match line is the answer", or keep?** — **OPEN, raised 2026-10-25.**
  The numbers say no new floor. See the Bugs entry "three weak notes attach".
- **Facts kept fell from 76.3 to 67.2 in a hundred: read the six questions that went from 3 of 3 to 0 of 3, then decide** — **OPEN, raised 2026-10-25.**
  Two earlier runs on the old library differed by up to 6 points, so the signal is weak. See the Bugs entry "The new notes crowd the old ones".
- **Your eye on plan 100's wording** — **OPEN, raised 2026-10-26.**
  The seven Baldur's Gate 3 notes, the two new tips (165, 166), ten plain-word tip edits, and the "Suggest as a tip" line's wording.

A new call lands here, one line, with what it decides. Every call already made is
written up in full in [the locked decisions file](audit/maintainer-decisions-locked.md).

## Bugs

- ★ `[KB]` **A notes card ("From bonsAI's own note") was drawn under an answer with the knowledge library switch OFF** — **ACCEPTED, by design: the maintainer's call 2026-10-18 ("That's fine"); found 2026-10-18 (plan 96 block M, Deck).**
  A stopped answer with "Use local knowledge base" off still drew a notes card once, and not on another try. The maintainer's call: that is fine (by design). Evidence `workshop:test-evidence/plan96-P96-R2-STOP-NOCARD-2.json`.
- ★★ `[KB]` **Story spoilers: Hide more drew fewer spoiler covers than Default on the PC answer test** — **MEASURED 2026-10-25 (plan 100 lane X), the maintainer decides.**
  First run: 23 covers in 100 answers against 29. **Second run: 20.6 against 23.8.** Hide more missed no story cover that Default kept. Contradictions: 92.6 clean against 88.9. Reports: [Detail](roadmap-kb-details.md#plan-100-notes-moved-from-the-knowledge-base-roadmap-2026-10-25)
- ★★ `[KB]` **ui: in a second checklist answer, the route's steps were drawn but the D-pad could not reach them** — **OPEN, found 2026-10-24 (plan 98 Deck block KR).**
  The ring went to the tab bar. One sighting, with a muddled setup. Evidence `workshop:test-evidence/plan98-P98-KR-REPLAYS.json` (the P98-ROUTE-01 line).
- ★ `[KB]` **measure: on a made-up question, three weak notes attach with a keyword score of 0.00 every time** — **MEASURED 2026-10-25 (plan 100 lane X), the maintainer decides.**
  A floor at no keyword support clears the two made-up bosses but loses 3 right notes; a floor high enough to clear the other two loses 19. The "No close match" line already shows on all four. **The numbers say no new floor.** Reports: [Detail](roadmap-kb-details.md#plan-100-notes-moved-from-the-knowledge-base-roadmap-2026-10-25)
- ★ `[KB]` **A "where am I stuck" answer for Hollow Knight added an "If you want to cheat" section** — **OPEN, found 2026-10-24 (plan 98 Deck block K3).**
  The route answer suggested emulator and fast-travel exploits. Seen once. **Counted 2026-10-25 (plan 100 block L0): 0 cheat sections in 2 route questions** (D137: no prompt line added). [Detail](roadmap-kb-details.md#plan-100-notes-moved-from-the-knowledge-base-roadmap-2026-10-25)
- ★ `[KB]` **In Speed mode, the meaning check on troubleshooting tips never runs** — **ACCEPTED, 2026-09-28.** The
  maintainer chose this on 2026-09-05 to save about a second per Speed question
  ([D62](audit/maintainer-decisions-archive.md#d62--locked-2026-09-05-raised-2026-09-05--the-second-bug-fixing-session-four-calls-before-go)
  item 2). A stray word match can attach a wrong tip. A fix would run the meaning search only when the word hits are thin;
  that needs a cut-off picked and measured. [Detail](roadmap-kb-details.md#speed-mode-tip-gap)
- ★ `[KB]` **Story spoilers: under Hide less the answer test's no-contradiction rate read 90.7%, against 100%** — **MEASURED 2026-10-25 (plan 100 lane X), the maintainer decides.**
  First run 90.7% (`workshop:archive/research/kb-answer-eval-2026-10-24-p98b-open.md`). **Second run: 94.4% clean** (51 of 54; `workshop:archive/research/kb-answer-eval-2026-10-25-p100-open.md`).
- ★ `[KB]` **The Sims 4 library holds two fire notes that disagree** — **OPEN, found 2026-10-25 (plan 100 lane N3).**
  The older note "Fires" (section 112 in `data/kb/strategy_seed.json`) says there are no firefighters. The Sims wiki says they were added in a patch and come when a smoke alarm sees the fire, and the new Fire note (1200) follows the wiki. The old note needs correcting, then a library rebuild.
- ★ `[KB]` `[QA]` **The note-model test script writes its JSON report even when told not to** — **OPEN, found 2026-10-25 (plan 100).**
  `scripts/kb/eval_kb_embed_models.py` always writes its JSON report into the workshop (around line 1870); the no-report flag only skips the text report. It overwrote a workshop file on 2026-10-25. Fix: honour the flag for the JSON file too.
- ★★ `[KB]` **The new notes crowd the old ones: five held-back questions lost their note from the first three and facts kept fell nine points after the four games' notes landed** — **MEASURED 2026-10-25 (plan 100 lane X), the maintainer decides.**
  The five: the Portal 2 gels, the BG3 class, an audio tip and two GTA rows. Facts kept 76.3 down to 67.2 in a hundred after the four games' notes landed; run-to-run noise is up to 6 points, so the drop needs a read before it is believed. Six questions went from 3 of 3 to 0 of 3. Reports: [Detail](roadmap-kb-details.md#plan-100-notes-moved-from-the-knowledge-base-roadmap-2026-10-25)
- ★★ `[KB]` **Thumbs-down: after Undo with a game running, Down stopped on the notes block** — **OPEN, found 2026-10-24 (plan 98 Deck block K3).**
  The page had lost the window's focus (the lost-focus family from plan 97), so Down did nothing. Closing and reopening Quick Access cleared it but emptied the question box. Same lost-focus family as plan 97's freeze. Evidence `workshop:test-evidence/plan98-P98-DEMOTE-01-game.json`.
- ★★ `[KB]` **Unrelated questions can still get a game card stapled on** — **ACCEPTED 2026-08-27.** Raising the word floor costs real matches and the
  model mostly ignores a card that does not fit. Earlier sightings: [Detail](roadmap-kb-details.md#plan-100-notes-moved-from-the-knowledge-base-roadmap-2026-10-25)
  **Deck 2026-10-24 (plan 98 block K0), MEASURED:** "what time is it" still attached three notes (re-run 2026-10-25 too); the junk-phrase entry in Deck check owed has the fix. Word for word: [Detail](roadmap-kb-details.md#plan-98-notes-moved-from-the-knowledge-base-roadmap-2026-10-24)
  [D28](audit/maintainer-decisions-archive.md#d28--ordinary-phrases-attach-game-cards-how-hard-should-the-floor-be) ·
  [Detail](roadmap-kb-details.md#ordinary-phrases-attach-game-cards)
- ★★ `[KB]` `[QA]` **Screenshot reading ignores the game name it was handed** — **OPEN, found 2026-10-24 (plan 98 lane I).**
  On God of War's play and pause pictures the Deck's AI ignored the handed-over game name in 4 of 9 asks. See the screenshot entry in Next.
- ★★★★ `[KB]` **What ships loses to its own meaning half on questions nobody tuned against** — **ACCEPTED, decided
  2026-09-06.** Leaning the search toward meaning finds the right note first a little more often, but it would bury a new
  note with no meaning index yet. That reason is gone since 2026-09-07 (every note is now guaranteed an index), but two
  other objections stand, and nothing has been re-measured on the bigger library. Weights stay even. [D82](audit/maintainer-decisions-locked.md#d82--open-raised-2026-09-06--leaning-the-search-on-meaning-wins-on-the-measurements-and-breaks-three-rules-we-set-on-purpose) · [Detail](roadmap-kb-details.md#the-shipping-retrieval-arm-loses-to-the-vector-half-alone-on-rows-nobody-tuned-against)

## Deck check owed

- ★ `[KB]` **A thank-you or a junk phrase is treated as a follow-up to the previous question** — **VERIFY, landed 2026-10-25 (plan 100 lane F, `811fb977`, `426af298`), unit-tested.**
  A thank-you, a greeting or a question about the time, date or weather now gets a short reply of its own: no notes searched, no earlier answer carried forward, and the remembered boss kept for the next real follow-up. Before the fix the Deck failed two of three halves (2026-10-25, block L0; `workshop:test-evidence/plan100-P98-JUNK-PHRASES-try2.json`).
  **Still owed:** P100-THANKS-01 (block L1; not run on 2026-10-25; the rig dropped; runbook written): no Deck result yet. Earlier text: [Detail](roadmap-kb-details.md#plan-100-notes-moved-from-the-knowledge-base-roadmap-2026-10-25)
- ★ `[KB]` **Baldur's Gate 3's seven notes: the maintainer's read** — **VERIFY, landed 2026-10-25 (plan 100 lanes N1 to N4), owed to your eye.**
  Seven Wikipedia-only notes (its own wiki is NonCommercial): Owlbear, Githyanki Warriors, Minthara, Goblin Horde, Explosive Barrel, Potions, Weapon Poison. Five of the seven are tabletop lore with no fight advice; you read them in the chat on 2026-10-25 and chose to land them (D137 session). Your read of the notes themselves is still owed.
  Library check: P100-FOUR-GAMES-01 (block L2; not run on 2026-10-25; the rig dropped; runbook written), see the Phase 5 entry in Next.
- ★ `[KB]` **Route look: no "Needs: …" part is written for steps that need an item or ability** — **VERIFY, landed 2026-10-25 (plan 100 lane P, `e5ba73bd`), unit-tested.**
  The checklist instruction now asks for ". Needs: <the thing>" on a step that needs an item, ability or unlock, in the shape the panel already draws.
  **Still owed:** P100-NEEDS-01 (block L1; not run on 2026-10-25; the rig dropped; runbook written): no Deck result yet. The step list is drawn only after a branch button is pressed (a fresh question gets the branch menu by design), so the check presses a branch first.
  **Measured 2026-10-25 (plan 100 lane X):** the answer test cannot count "Needs" steps (first turns only; the two-turn pairs drew no checklist in 48 turns). The Deck check, a branch button first, is the only measurement.
- ★ `[KB]` **Route look: the shown steps are forgotten when the cache is cleared** — **VERIFY, landed 2026-10-25 (plan 100 lane R, tip `0152f6fa`), unit-tested.**
  The steps a person opened by hand now travel in the same per-game save as the ticks, load back with them and clear with them; the browser-storage copy is gone.
  **Still owed:** P100-ROUTE-SAVE-01 (block L1; not run on 2026-10-25; the rig dropped; runbook written): no Deck result yet.
- ★ `[KB]` **Story spoilers: the Search tab's entry lands on the section line, not on the new row** — **VERIFY, landed 2026-10-25 (plan 100 lane W, `34a707f9`, Haiku 5.5 high, on trial), unit-tested.**
  Searching "spoilers" or "how much" now lands the ring on the Default button of the "How much to hide" row.
  **Still owed:** P100-SEARCH-TIER-01 (block L1; not run on 2026-10-25; the rig dropped; runbook written): no Deck result yet.
- ★ `[KB]` **Yoshi's Story's "Starting out" note contradicted itself about its levels** — **VERIFY, landed 2026-10-25 (plan 100 lane Y, `551ca270`).**
  The first sentence of section 376 now says six worlds (pages) of four levels each, from the Mario wiki page re-read on 2026-10-25.
  **Still owed:** P100-YOSHI-01 (block L1, with the test library installed; not run on 2026-10-25; the rig dropped; runbook written): no Deck result yet.
- ★ `[KB]` **Thumbs-down: "ranked lower by you" stays on an answer already saved after Undo** — **VERIFY, landed 2026-10-25 (plan 100 lane U, `1abd7a31`), unit-tested.**
  After "Not really" then "Wrong tip", Show details now shows "ranked lower by you" on that answer at once, and Undo takes it away.
  **Not fixed:** an older answer's saved tag stays until a new question is asked. **Owed:** P100-LOWERED-01 (block L2; not run on 2026-10-25; the rig dropped; runbook written): no Deck result yet. Earlier text: [Detail](roadmap-kb-details.md#plan-100-notes-moved-from-the-knowledge-base-roadmap-2026-10-25)
- ★★ `[KB]` **Thumbs-down: Undo shows only on the newest answer, so an older mark has no way back** — **VERIFY, landed 2026-10-25 (plan 100 lane U, four commits, tip `3a63a5d4`), unit-tested.**
  The Knowledge base section (Ollama tab) now shows "Lowered notes: N" with a Clear button under the Update/Remove row whenever N is above 0. Clear asks first, then the marks are emptied.
  **Still owed:** P100-LOWERED-01 (block L2; not run on 2026-10-25; the rig dropped; runbook written): no Deck result yet. Earlier text: [Detail](roadmap-kb-details.md#plan-100-notes-moved-from-the-knowledge-base-roadmap-2026-10-25)
- ★★ `[KB]` **Story spoilers: under Hide more, a cover with no boss name in it still opens on a game with no story profile** — **VERIFY, landed 2026-10-25 (plan 100 lane V, tip `eab4f33e`), unit-tested.**
  The "How much to hide" setting now reaches the screen's cover rule. Under Hide more, a cover on a game with no story stays shut, on screen and in Copy; Default and Hide less are unchanged.
  **Still owed:** P100-HIDE-MORE-SCREEN-01 (block L1; not run on 2026-10-25; the rig dropped; runbook written): no Deck result yet.
- ★★ `[KB]` **A troubleshooting question that only describes the symptom reaches no tips** — **ACCEPTED (D81) for the meaning search; the wording fix landed 2026-10-25 (plan 100 lane T).**
  "The game drops me back to the library" reached no crash tip. The held meaning search stays held. The wording fix is the entry below; the numbers are there. Row P100-TIPS-01 (block L1; not run on 2026-10-25; the rig dropped; runbook written) is owed.
  Older text: [Detail](roadmap-kb-details.md#plan-100-notes-moved-from-the-knowledge-base-roadmap-2026-10-25)
- ★★ `[KB]` **Hidden spoiler box stays shut on games with no Steam ID and on name-first questions** — **VERIFY, landed
  2026-09-15, unit-tested.** A game known only by name now opens its box, and naming the boss up front keeps the answer in
  plain text. Passed on the Deck: name-first (STRAT-SPOIL-FIRST-01), knowledge base off (DRG-01b) and library absent (DRG-01c; no hidden block was written, so a cover was not tested directly).
  **Still owed:** STRAT-SPOIL-NAME-01 could not run six times, last 2026-10-25 (plan 100 block L0: Doom 64: Retribution was not on the Recent Games row; `workshop:test-evidence/plan100-STRAT-SPOIL-NAME-01.json`): it needs the maintainer's hand launch (on the checks page). [Detail](roadmap-kb-details.md#plan-98-notes-moved-from-the-knowledge-base-roadmap-2026-10-24)
  Evidence `workshop:test-evidence/plan79-STRAT-SPOIL-NAME-01.json`. [Detail](roadmap-kb-details.md#hidden-spoiler-box-stays-shut-on-games-with-no-steam-id-and-on-name-first-questions)
- ★★★ `[KB]` **A troubleshooting question mostly never reaches the tips** — **VERIFY, landed 2026-10-25 (plan 100 lane T, seven commits, tip `ae8c59b6`), measured on this PC.**
  Five tips now carry the plain words people type, and two new tips (165: sound to the TV instead of headphones; 166: menus out of place on a TV, both "Researched, unconfirmed") fill the gaps. Of the 24 plain sentences, 17 now reach a tip (8 before) and 15 of the 22 that have a right tip reach it (5 before); none reaches a wrong tip.
  **2026-10-25 (lane T follow-up, `5943260b`):** the bare word "storage" no longer routes a question to the storage tips; it needs full, space, free, left, drive, card, sd, microsd, install, gb or "out of" beside it. Found when two blind Portal 2 questions about the Weighted Storage Cube were handed the storage-full tip.
  **Still owed:** P100-TIPS-01 (block L1; not run on 2026-10-25; the rig dropped; runbook written), and your read of the two new tips and ten of the plain-word edits (the checks page). Earlier text: [Detail](roadmap-kb-details.md#plan-100-notes-moved-from-the-knowledge-base-roadmap-2026-10-25)
- ★★★★★ `[KB]` **Community tip contribution: "Suggest as a tip"** — **VERIFY, landed 2026-10-25 (plan 100 lane J, five commits, tip `3ddbb2b5`), unit-tested.**
  Under a finished answer a "Suggest as a tip" button now shows (before Show details; it stays after a rating). A saves a note file under Desktop/bonsAI_logs/suggested-tips and shows "Saved <file>. To send it in: <link>" as text. With "Save files to Desktop" off, the line names the Permissions tab.
  **Still owed:** P100-SUGGEST-01 (block L2; not run on 2026-10-25; the rig dropped; runbook written): no Deck result yet, and your eye on the line's wording (it names no folder and does not say to attach the file). Earlier text: [Detail](roadmap-kb-details.md#rag-phase-7-community-tip-contribution-rag-phase-8)

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
- ★★★ `[KB]` **KB visual maps** — **PARTIAL; two shapes picked on the mock-up board 2026-10-10, the route built 2026-10-24.** Nothing draws anything in a reply today.
  **A route, one step at a time:** built 2026-10-24 as the look of the strategy checklist (see the route-look entry in Deck check owed above). The "Needs: …" part on steps that need an item or ability landed 2026-10-25 and is owed a Deck check (see Deck check owed).
  **Your screenshot, marked**: up to three numbered marks (hit, avoid, dodge), each saying whether the Deck's AI is sure; an unsure mark is dashed. A scoring test first: a stronger model scores, out of ten, what the Deck's models mark, and helps teach them.
  Not chosen as drawn: a fuller boss card, a whole-kingdom map.
  [Mock-up board, tab 5](https://claude.ai/artifact/XyZfUSPGRZdm2P3mTGV9tR) · [notes](demos/mockup-board/README.md) · [Detail](roadmap-kb-details.md#kb-visual-maps)
- ★★★★ `[KB]` **KB online / versus strategy content** — **OPEN, discovery locked 2026-08-09.** Multiplayer questions
  (roles, callouts, co-op) get nothing specific today. Plan: new card kinds, Left 4 Dead 2 first, then Counter-Strike 2,
  from archive dumps only. Two to three weeks. [Plan](planning/17-kb-online-versus-strategy-content.md) ·
  [Detail](roadmap-kb-details.md#kb-online--versus-strategy-content-and-rag-phase-5)
- ★★★★ `[KB]` `[QA]` **Measure how well the AI reads a screenshot: which game, which area, which boss** — **PARTIAL, added 2026-09-25. Step 1 done 2026-10-24 (plan 98 lane I, `6e46b9fc` to `1219b07c`): a labelled picture set and a scoring script.**
  First figures: with the game handed over the AI named it 75 times in 100 and the area 42; with nothing handed over, 17 and 29. It often invents. Full text: [Detail](roadmap-kb-details.md#plan-100-notes-moved-from-the-knowledge-base-roadmap-2026-10-25)
  The set is thin; a bigger one needs the maintainer's hand. **Step 2** (each picture model the Deck offers, then fix where it fails) is still open.
  **2026-10-25 (plan 100 lane P, `55771b7a`), measured: no gain.** With the game handed over the AI named it 58 and 50 times in a hundred (75 on 2026-10-24); two runs differ by up to 21 points. Still PARTIAL. Report: [Detail](roadmap-kb-details.md#plan-100-notes-moved-from-the-knowledge-base-roadmap-2026-10-25)
  [Detail](roadmap-kb-details.md#measure-how-well-the-ai-reads-a-screenshot) · **From Phase 7 (call 8):** a screenshot feeding the search is not built.
- ★★★★ `[KB]` **RAG Phase 5: depth on the thirteen titles** — **PARTIAL.** The thirteen original titles went from 133 to
  164 notes. The four that had none now have enemy and item notes (plan 100, 2026-10-25): Baldur's Gate 3 7, GTA San Andreas 15, The Sims 4 15, Portal 2 14 (29 of 38 games have them). **Measured:** 100 of 102 blind questions find their note in the first three, but the new notes crowd the old ones (see the Bugs entry). Also waits on P100-FOUR-GAMES-01 (block L2; not run on 2026-10-25; the rig dropped; runbook written) and your read of the Baldur's Gate 3 notes. [Detail](roadmap-kb-details.md#plan-100-notes-moved-from-the-knowledge-base-roadmap-2026-10-25)
  [Plan](planning/28-phase5-corpus-depth.md) · [Detail](roadmap-kb-details.md#plan-100-notes-moved-from-the-knowledge-base-roadmap-2026-10-25)
- ★★★★★★ `[KB]` **RAG Phase 8: catalog corpus** — **OPEN, intent only.** The change that gets most people's games real
  notes instead of the model's memory: top 1000 Steam titles, top 100 on Deck, an emulated slice. Months of work.
  **As of 2026-10-03:** the source study is done, and the library is at 38 games and 414 notes
  ([D111](audit/maintainer-decisions-locked.md#d111--locked-2026-09-17-raised-2026-09-17--58-phase-1-the-notes-own-words-on-screen-and-wiki-notes-taken-without-rewriting--nine-calls-before-the-build)).
  [Detail](roadmap-kb-details.md#rag-phase-8-catalog-corpus) · **From Phase 7 (call 8):** add-on packs come first.
