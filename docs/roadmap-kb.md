# bonsAI Roadmap: knowledge base and RAG

What this file holds: everything about the game notes and the search that feeds them, with its bugs, its owed Deck
checks and its plans together, so you can open one file and pick up where you left off. The rest of the roadmap is in
[roadmap.md](roadmap.md). The long notes for these entries are in [roadmap-kb-details.md](roadmap-kb-details.md). The
zoomed-out picture, what each next step buys a person and rough costs: [the status report](planning/37-rag-status-report.md).
Same house rules as the roadmap (five lines an entry, stars ascending in each list, the status words, a fix moves to
**Deck check owed** and then to Done in the same commit): [house rules](roadmap.md#house-rules-for-this-file).

## Knowledge base and RAG

Architecture: [knowledge-base.md](knowledge-base.md). The agreed answer-quality work: [plan 30](planning/30-kb-answer-quality-plan.md).

**Where things stand (2026-11-03).** The library people can download is 2026.10.25: 38 games, 414 notes, 164 Deck tips
and 351 tap-to-define words; the maintainer published it on 2026-10-25 and both channels were read back byte for byte
([the releases table](knowledge-base.md)). The build on this PC is bigger: plan 100 added 51 notes and two tips, and plan 102 added 118 notes for eight games and one tip, so it should read 583 notes and 167 tips once the session's final build prints the count. It is not published yet: the maintainer's publish is owed, and the download sites still serve 2026.10.25. Every one of the 38 games has at least one enemy or item note (counted 2026-11-02); with plan 102, 15 of them have those notes in the labelled short-line shape (7 before). The Deck's own copy is
2026.10.25 (`workshop:test-evidence/plan98-P98-KS-LIBRARY.json`).
Search puts the right
note in the top three 85.3 times in a hundred on questions nobody tuned against, measured 2026-09-18 on the older library.
The Deck's own model keeps the note's facts 79.5 times in a hundred with the answer-first shape that shipped (2026-09-07). The answer test on this PC read facts kept 71.2 in a hundred on 2026-11-02 and 67.2 on 2026-10-25 with the library unchanged, so runs differ by about four points. Do not compare either with figures from before wave
three: both checks had faults. [Wave three's report](../../bonsAI-workshop/archive/48-kb-wave-three-session.md). More:
[blind questions](roadmap-kb-details.md#blind-questions-done), [the three new games](roadmap-kb-details.md#three-new-games-and-their-notes).

**Still short:** getting to the troubleshooting tips, though better since 2026-10-25. Of 24 fresh plain sentences, 8 reached a tip before the wording fix, 17 after it and 19 now (17 the right one, 15 before the find-my-PC tip of 2026-11-02), none a wrong one (PC). On the Deck 2026-10-26, 2 of 3 plain sentences reached their tip; the third (a crash sentence) did after the fix, in a chat about another game and, reworded, in a Hollow Knight chat (row P100-TIPS-01-try3).

**The one-second wait on every question is explained:** the Deck holds one model at a time, so the answering and note-search models push each other out. Full text and evidence: [detail](roadmap-kb-details.md#plan-98-notes-moved-from-the-knowledge-base-roadmap-2026-10-24).

## Calls waiting on you

- **Keep or undo "This screenshot is from <game>." at the start of a picture question?** — **OPEN, raised 2026-11-03 (plan 102 lane D, call 5).**
  With the game handed over the AI named the right game 91 and 92 times in a hundred (67 and 70 before) and never mixed up God of War, but named the place on screen only 29 and 30 times (52 and 53 before). It is on by default now. Row P102-PICTURE-01 (block R1) is owed. Reports `workshop:archive/research/screenshot-reading-2026-11-02-p102-s1-run1.md` and `-s1-run2.md`.
- **Stop the word search handing the blend ten notes? (the crowding fix)** — **OPEN, raised 2026-11-03 (plan 102 lane E).**
  The fall in facts kept is mostly noise, but after 51 more notes the word search returns up to ten notes instead of three, so one-word coincidences beat a note found only by meaning. The fix (cap the list before blending, or move the floor) touches the search service. See the Bugs entry "The new notes crowd the old ones".
- **Close the card style pass?** — **OPEN, raised 2026-11-03 (plan 102 lane G).**
  A tie: fifteen prose cards rewritten in the labelled shape kept every fact in 48 of 90 answers against 44 of 90, while the same library swung 18 points between its own two runs. The rewrites are kept (`workshop:archive/research/card-style-rewrites-2026-11-02-p102.patch`). See the Next entry.
- **Your first monthly read of ten replies** — **OPEN, raised 2026-11-03 (plan 102 lane F).**
  Ten whole replies for you to judge: `workshop:archive/research/kb-answer-sample-2026-11-02-p102-reading.md`.
- **Your eye on plan 100's wording** — **OPEN, raised 2026-10-26.**
  The seven Baldur's Gate 3 notes, the two new tips (165, 166), ten plain-word tip edits, and the "Suggest as a tip" line's wording.

A new call lands here, one line, with what it decides. Every call already made is
written up in full in [the locked decisions file](audit/maintainer-decisions-locked.md).

## Bugs

- ★ `[KB]` **A notes card ("From bonsAI's own note") was drawn under an answer with the knowledge library switch OFF** — **ACCEPTED, by design: the maintainer's call 2026-10-18 ("That's fine"); found 2026-10-18 (plan 96 block M, Deck).**
  A stopped answer with "Use local knowledge base" off still drew a notes card once, and not on another try. The maintainer's call: that is fine (by design). Evidence `workshop:test-evidence/plan96-P96-R2-STOP-NOCARD-2.json`.
- ★ `[KB]` **On a no-story game named in the question, with nothing running, a cover under Default does not open by itself (Brotato, 2026-11-03)** — **OPEN, found 2026-11-03 (plan 102 Deck block R0).**
  The cover was drawn under Default and stayed shut, as under Hide more, so the two settings looked alike on that game. The test had "open after consent" off, so this may be by design; the evidence file leaves it to the owner, and one cause to read is whether the screen's no-story rule keys on the running game's id and not a typed name. Evidence `workshop:test-evidence/plan102-P100-HIDE-MORE-SCREEN-01-try2.json`.
- ★ `[KB]` **In Speed mode, the meaning check on troubleshooting tips never runs** — **ACCEPTED, 2026-09-28.** The
  maintainer chose this on 2026-09-05 to save about a second per Speed question
  ([D62](audit/maintainer-decisions-archive.md#d62--locked-2026-09-05-raised-2026-09-05--the-second-bug-fixing-session-four-calls-before-go)
  item 2). A stray word match can attach a wrong tip. A fix would run the meaning search only when the word hits are thin;
  that needs a cut-off picked and measured. [Detail](roadmap-kb-details.md#speed-mode-tip-gap)
- ★★ `[KB]` `[focus]` **With the panel's page out of focus, Down from the notes block skips the open details panel and lands on the suggestion chips** — **OPEN, found 2026-11-02 (plan 102 lane C, in the test setup; not yet seen on the Deck).**
  After lane C's fix (`1d262a94`, `8ce44695`) Down no longer dies there: the press moves. But the details tabs row and the chip grid have no Steam nodes of their own (plan 97 gave the notes block that), so the ring jumps past the open details panel, a moving press and not yet the stop a person expects. Row P102-UNDO-FOCUS-01 (block R1) reads it.
- ★★ `[KB]` `[ui]` **Up from a checklist's step 1 lands on the Copy reply text icon, and Down from that icon skips the whole step list and lands on Mark reply helpful** — **OPEN, found 2026-11-03 (plan 102 Deck block R0).**
  Seen three times (once in a chat with one list, twice with two). Down from the answer reaches step 1 and the steps walk as they should; the skip is on the way back. Older turns collapse under "N earlier", so two lists never show at once. Evidence `workshop:test-evidence/plan102-P98-ROUTE-01-try3.json`.
- ★★ `[KB]` `[QA]` **The answer test's samples are not independent: the same prompt gave the identical reply three times, so three samples can be one** — **OPEN, found 2026-11-02 (plan 102 lane E).**
  The answer cache or fixed sampling is the suspect. It makes six questions at 0 of 3 together easy to produce with nothing changed. Report `workshop:archive/research/kb-crowding-read-2026-11-02-p102.md`.
- ★★ `[KB]` **The new notes crowd the old ones: five held-back questions lost their note from the first three after the four games' notes landed** — **MEASURED 2026-10-25 (plan 100 lane X), read 2026-11-02 (plan 102 lane E); the maintainer decides.**
  Mostly noise: of the six questions behind the nine-point fall in facts kept, only the Portal 2 gels is a worse answer (0 of 13 on today's library); two have too-narrow phrase lists and three are noise (the unchanged library read 71.2 against 67.2). **One real cause in the search:** after the 51 notes the word search returns up to ten notes instead of three, which pushes a note found only by meaning down the blend; four of the five lost slots are worse for a player.
  The fix candidate is in Calls. Report `workshop:archive/research/kb-crowding-read-2026-11-02-p102.md` and the proposed phrase-list patch beside it. Older text: [Detail](roadmap-kb-details.md#plan-102-notes-moved-from-the-knowledge-base-roadmap-2026-11-03)
- ★★ `[KB]` **Unrelated questions can still get a game card stapled on** — **ACCEPTED 2026-08-27.** Raising the word floor costs real matches and the
  model mostly ignores a card that does not fit. Earlier sightings: [Detail](roadmap-kb-details.md#plan-100-notes-moved-from-the-knowledge-base-roadmap-2026-10-25)
  **Deck 2026-10-24 (plan 98 block K0), MEASURED:** "what time is it" still attached three notes (re-run 2026-10-25 too); the junk-phrase fix is in [Done](roadmap.md#done-after-v060) since 2026-10-26 (row P100-THANKS-01-try2, `workshop:test-evidence/plan100-P100-THANKS-01-try2.json`). Word for word: [Detail](roadmap-kb-details.md#plan-98-notes-moved-from-the-knowledge-base-roadmap-2026-10-24)
  [D28](audit/maintainer-decisions-archive.md#d28--ordinary-phrases-attach-game-cards-how-hard-should-the-floor-be) ·
  [Detail](roadmap-kb-details.md#ordinary-phrases-attach-game-cards)
- ★★★★ `[KB]` **What ships loses to its own meaning half on questions nobody tuned against** — **ACCEPTED, decided
  2026-09-06.** Leaning the search toward meaning finds the right note first a little more often, but it would bury a new
  note with no meaning index yet. That reason is gone since 2026-09-07 (every note is now guaranteed an index), but two
  other objections stand. **Re-measured 2026-11-02 (plan 102 lane X2, 465-note library, held-back questions, right note in the first three):** the shipping blend 90.8 in a hundred, the meaning search alone 92.2, the word search alone 85.6, so the claim held on the bigger library (`workshop:archive/research/kb-embed-bakeoff-2026-11-02-arms-p102-before.md`; the 2026-10-25 run, `...-p100-after-arms.md`, read the same).
  Weights stay even. [D82](audit/maintainer-decisions-locked.md#d82--open-raised-2026-09-06--leaning-the-search-on-meaning-wins-on-the-measurements-and-breaks-three-rules-we-set-on-purpose) · [Detail](roadmap-kb-details.md#the-shipping-retrieval-arm-loses-to-the-vector-half-alone-on-rows-nobody-tuned-against)

## Deck check owed

- ★ `[KB]` **Baldur's Gate 3's seven notes: the maintainer's read** — **VERIFY, landed 2026-10-25 (plan 100 lanes N1 to N4), owed to your eye.**
  Seven Wikipedia-only notes (its own wiki is NonCommercial): Owlbear, Githyanki Warriors, Minthara, Goblin Horde, Explosive Barrel, Potions, Weapon Poison. Five of the seven are tabletop lore with no fight advice; you read them in the chat on 2026-10-25 and chose to land them (D137 session). Your read of the notes themselves is still owed.
  **Deck 2026-10-26, MEASURED (row P100-FOUR-GAMES-01):** the Minthara question attached the Minthara note; the answer does not say how the grove ends. Words and evidence: [Detail](roadmap-kb-details.md#plan-102-notes-moved-from-the-knowledge-base-roadmap-2026-11-03).
- ★ `[KB]` **The eight thin games' notes: the maintainer's read** — **VERIFY, landed 2026-11-02 (plan 102 lanes N5 to N12), owed to your eye.**
  118 notes in the labelled shape: Grand Theft Auto V 15 (`5b0ebf02`), Grand Theft Auto IV 15 (`0e0de2da`), Super Mario 64 15 (`df5c3fec`), Paper Mario: The Thousand-Year Door 15 (`db539690`), Pikmin 2 13 (`6cb02fde`), Doom 64 15 (`50a63bd1`), Donkey Kong 64 15 (`83f16b05`), Mario Kart 64 15 (`dc63a4f7`). Every sentence comes from a wiki page the fetcher read; the FOSS reviewer read every file and nothing blocks publishing (Paper Mario had five story-spoiler risks, fixed before landing).
  You did not answer the quality read in time, so call 2's default applied and the notes landed. 236 blind questions for them are in the search test (lane Q2, tip `76f3619d`). Row P102-THIN-GAMES-01 (block R1) is owed.
- ★ `[KB]` **The Sims 4 fire notes disagreed about firefighters** — **VERIFY, landed 2026-11-02 (plan 102 lane B, `f81d349e`, `cfbc67d8`), read back from the built library by the lane.**
  The older "Fires" note and the glossary's "Fire extinguisher" entry now follow the wiki: firefighters come on their own when a smoke alarm is in the room where the fire breaks out. Row P102-SIMS-FIRE-01 (block R1) is owed. Before: on the Deck 2026-10-26 the older note came first and the two notes disagreed (`workshop:test-evidence/plan100-P100-FOUR-GAMES-01.json`).
- ★★ `[KB]` **Thumbs-down: after Undo with a game running, Down stopped on the notes block** — **VERIFY, landed 2026-11-02 (plan 102 lane C, `1d262a94`, `8ce44695`), unit-tested.**
  The thumbs-down rows now ask the panel's window for its focus when the ring lands on them, and Down from the notes block no longer dies when the page lacks focus: the press gives way and Steam moves the ring. **Say plainly:** on the Deck the ring will most likely land on the suggestion chips, past the open details panel, a moving press and not yet the stop a person expects (the Bugs entry above).
  Row P102-UNDO-FOCUS-01 (block R1: Show details open, the page read out of focus, four Downs, the fourth must move) is owed; its baseline P98-DEMOTE-01-game-try2 could not run on 2026-11-03 (a stuck suspend overlay). Evidence of the first sighting `workshop:test-evidence/plan98-P98-DEMOTE-01-game.json`.
- ★★ `[KB]` `[QA]` **Screenshot reading ignored the game name it was handed** — **VERIFY, landed 2026-11-02 (plan 102 lane D, `71389e3f`, `d755670b`); the maintainer confirms or reverts (Calls).**
  With a game running and a picture attached, the question now starts "This screenshot is from <game>.", on by default. PC numbers: right game 91 and 92 in a hundred (67 and 70 before), no God of War mix-up; place on screen 29 and 30 (52 and 53 before). Row P102-PICTURE-01 (block R1) is owed. See the screenshot entry in Next.
- ★★ `[KB]` **A troubleshooting question that only describes the symptom reaches no tips** — **ACCEPTED (D81) for the meaning search; the wording fix landed 2026-10-25 (plan 100 lane T).**
  "The game drops me back to the library" reached no crash tip. The held meaning search stays held. The wording fix is in [Done](roadmap.md#done-after-v060) ("A troubleshooting question mostly never reaches the tips"); the numbers are there. Deck 2026-10-26: row P100-TIPS-01 failed on one of three sentences; the retry P100-TIPS-01-try3 passed.
  **Plan 102 lane H (`c4d7c54a`, `82a08ad8`, `6a9e7b0a`, `943b0f86`):** a new tip 167 for a Deck that cannot find its PC; 19 of 24 plain sentences now reach a tip and 17 the right one (17 and 15 before), none a wrong one. Row P102-FINDPC-01 (block R1) is owed. Older text: [Detail](roadmap-kb-details.md#plan-100-notes-moved-from-the-knowledge-base-roadmap-2026-10-25)
- ★★ `[KB]` **Hidden spoiler box stays shut on games with no Steam ID and on name-first questions** — **VERIFY, landed
  2026-09-15, unit-tested.** A game known only by name now opens its box, and naming the boss up front keeps the answer in
  plain text. Passed on the Deck: name-first (STRAT-SPOIL-FIRST-01), knowledge base off (DRG-01b) and library absent (DRG-01c; no hidden block was written, so a cover was not tested directly).
  **Still owed:** STRAT-SPOIL-NAME-01 could not run again on 2026-11-03 (plan 102 block R0: Doom 64 was not running and a stuck suspend overlay blocked the Home shelf; `workshop:test-evidence/plan102-STRAT-SPOIL-NAME-01.json`; before that 2026-10-25, `workshop:test-evidence/plan100-STRAT-SPOIL-NAME-01.json`): it needs the maintainer's hand launch (on the checks page). [Detail](roadmap-kb-details.md#plan-98-notes-moved-from-the-knowledge-base-roadmap-2026-10-24)
  Evidence `workshop:test-evidence/plan79-STRAT-SPOIL-NAME-01.json`. [Detail](roadmap-kb-details.md#hidden-spoiler-box-stays-shut-on-games-with-no-steam-id-and-on-name-first-questions)

## Next

- ★★ `[KB]` **The eval cannot yet prove the meaning search rescues many questions** — **PARTIAL, counted 2026-10-24 (plan 98 lane F); thirty questions written 2026-11-02 (plan 102 lane I, `affaead1`).**
  Only 4 labelled questions got nothing from the word search, too few to gate a regression. Lane I wrote thirty questions built to get zero word-search hits on their note, each proved against the built library. The next step is a count of how many the blend rescues (the measurement lane's second half). Figures: [Detail](roadmap-kb-details.md#plan-98-notes-moved-from-the-knowledge-base-roadmap-2026-10-24)
  [Detail](roadmap-kb-details.md#eval-fixture-cannot-see-a-recall-failure)
- ★★★ `[KB]` **Card style pass** — **MEASURED 2026-11-02 (plan 102 lane G), a tie; the maintainer decides (Calls).**
  Fifteen prose cards rewritten as labelled short lines kept every fact in 48 of 90 answers, against 44 of 90 for the prose cards (4.4 points apart), while the same library swung 18 points between its own two runs; four long starting-out cards failed every run in both shapes. **The measurement does not support the pass.** The rewrites are kept as `workshop:archive/research/card-style-rewrites-2026-11-02-p102.patch`.
  ([D67](audit/maintainer-decisions-archive.md#d67--locked-2026-09-05--structured-cards-accept-prose))
- ★★★ `[KB]` **The AI almost never admits that no note covers the question: 3 of 24** — **OPEN, measured 2026-11-02 (plan 102 lane F).**
  On eight questions no note can answer, the AI admitted it in 3 of 24 replies (all three the back end's "No close match" footer, none its own words) and answered as if it knew in 21 of 24. The open step is prompt work. Report `workshop:archive/research/kb-answer-eval-2026-11-02-p102-unknown.md`. The deeper answer checks that found it are built (Done).
- ★★★ `[KB]` **KB visual maps** — **PARTIAL; two shapes picked on the mock-up board 2026-10-10, the route built 2026-10-24.** Nothing draws anything in a reply today.
  **A route, one step at a time:** built 2026-10-24 as the look of the strategy checklist (its entry is in Done). The "Needs: …" part on steps that need an item or ability was removed 2026-11-03 (`9615dc19`): it was never drawn in the Deck tries (Done).
  **Your screenshot, marked**: up to three numbered marks (hit, avoid, dodge), each saying whether the Deck's AI is sure; an unsure mark is dashed. A scoring test first: a stronger model scores, out of ten, what the Deck's models mark, and helps teach them.
  Not chosen as drawn: a fuller boss card, a whole-kingdom map.
  [Mock-up board, tab 5](https://claude.ai/artifact/XyZfUSPGRZdm2P3mTGV9tR) · [notes](demos/mockup-board/README.md) · [Detail](roadmap-kb-details.md#kb-visual-maps)
- ★★★ `[KB]` **Mod knowledge for modded games** — **OPEN, filed 2026-10-27 (plan 101, round 4); sources and licences listed 2026-11-02 (plan 102 lane J).** Known mod problems and load-order rules for the games people mod most, so "what's wrong with my load order" and "do these two mods clash" get an offline answer that names the mods bonsAI found on the device. Nexus Mods pages are never copied.
  **Found:** LOOT's rule lists are CC0 (free to use), about 20 KB for Fallout 4 and 80 KB for Skyrim SE squeezed, with 76 and 87 percent of their messages checkable without opening binaries. The Cyberpunk community wiki has no licence and its maintainer says it will not get one, so only own-words cards marked "Researched, unconfirmed"; Stardew Valley's sources are NonCommercial or mixed. The build and publish checks do not accept CC0 yet. Report `workshop:planning/assets/101-mod-knowledge-sources.md`.
  **Next step:** written permission from the Cyberpunk wiki's admins, and CC0 in the two checks. [Plan 101](planning/101-deep-mod-ai-hints.md) · earlier text: [Detail](roadmap-kb-details.md#plan-102-notes-moved-from-the-knowledge-base-roadmap-2026-11-03)
- ★★★★ `[KB]` **KB online / versus strategy content** — **OPEN, discovery locked 2026-08-09.** Multiplayer questions
  (roles, callouts, co-op) get nothing specific today. Plan: new card kinds, Left 4 Dead 2 first, then Counter-Strike 2,
  from archive dumps only. Two to three weeks. [Plan](planning/17-kb-online-versus-strategy-content.md) ·
  [Detail](roadmap-kb-details.md#kb-online--versus-strategy-content-and-rag-phase-5)
- ★★★★ `[KB]` `[QA]` **Measure how well the AI reads a screenshot: which game, which area, which boss** — **PARTIAL, added 2026-09-25. Step 1 done 2026-10-24 (plan 98 lane I); step 2 measured 2026-11-02 (plan 102 lane D).**
  Step 1: a labelled picture set and a scoring script; with the game handed over the AI named it 75 times in 100 (58 and 50 on 2026-10-25; runs differ by up to 21 points). **Step 2, on this PC:** with today's shape and the game handed over, qwen3.5:4b named the game 97 and the place 70 times in a hundred, gemma4:e4b-it-qat 97 and 64, qwen2.5vl:3b 100 and 36, llava:7b 97 and 6, against the Deck's starter model's 67 to 70 and 52 to 53. Reports `workshop:archive/research/screenshot-reading-2026-11-02-p102-*.md` (ten files).
  The set is thin; a bigger one needs the maintainer's hand. Still PARTIAL. [Detail](roadmap-kb-details.md#measure-how-well-the-ai-reads-a-screenshot) · older text: [Detail](roadmap-kb-details.md#plan-102-notes-moved-from-the-knowledge-base-roadmap-2026-11-03) · **From Phase 7 (call 8):** a screenshot feeding the search is not built.
- ★★★★ `[KB]` **RAG Phase 5: depth on the thirteen titles** — **PARTIAL.** The thirteen original titles went from 133 to 164 notes; plan 100 gave the four that had none enemy and item notes (Baldur's Gate 3 7, GTA San Andreas 15, The Sims 4 15, Portal 2 14) and **plan 102 (2026-11-02) gave eight thin games 118 more**: Grand Theft Auto V, Grand Theft Auto IV, Super Mario 64, Paper Mario: The Thousand-Year Door, Doom 64, Donkey Kong 64 and Mario Kart 64 15 each and Pikmin 2 13. Games with those notes in the labelled shape: 15 of 38 (7 before).
  **Measured:** 100 of 102 blind questions for the plan 100 games find their note in the first three, but the new notes crowd the old ones (Bugs entry). **Deck 2026-10-26 (row P100-FOUR-GAMES-01):** Portal 2 passed; GTA failed twice, then passed after the fix (`b48e4baf`; row P100-FOUR-GAMES-01-try3, `workshop:test-evidence/plan100-P100-FOUR-GAMES-01-try3.json`). Plan 102's notes are owed your read and a Deck row (Deck check owed). Stays PARTIAL for those reads and the call on crowding.
  Two small things the lanes left open for you are in [Detail](roadmap-kb-details.md#plan-102-notes-moved-from-the-knowledge-base-roadmap-2026-11-03). [Plan](planning/28-phase5-corpus-depth.md) · [Detail](roadmap-kb-details.md#plan-100-notes-moved-from-the-knowledge-base-roadmap-2026-10-25)
- ★★★★★★ `[KB]` **RAG Phase 8: catalog corpus** — **OPEN, intent only.** The change that gets most people's games real
  notes instead of the model's memory: top 1000 Steam titles, top 100 on Deck, an emulated slice. Months of work.
  **As of 2026-10-03:** the source study is done, and the library is at 38 games and 414 notes
  ([D111](audit/maintainer-decisions-locked.md#d111--locked-2026-09-17-raised-2026-09-17--58-phase-1-the-notes-own-words-on-screen-and-wiki-notes-taken-without-rewriting--nine-calls-before-the-build)).
  [Detail](roadmap-kb-details.md#rag-phase-8-catalog-corpus) · **From Phase 7 (call 8):** add-on packs come first.
