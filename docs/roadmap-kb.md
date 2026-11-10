# bonsAI Roadmap: knowledge base and RAG

What this file holds: everything about the game notes and the search that feeds them, with its bugs, its owed Deck
checks and its plans together, so you can open one file and pick up where you left off. The rest of the roadmap is in
[roadmap.md](roadmap.md). The long notes for these entries are in [roadmap-kb-details.md](roadmap-kb-details.md). The
zoomed-out picture, what each next step buys a person and rough costs: [the status report](planning/37-rag-status-report.md).
Same house rules as the roadmap (five lines an entry, stars ascending in each list, the status words, a fix moves to
**Deck check owed** and then to Done in the same commit): [house rules](roadmap.md#house-rules-for-this-file).

## Knowledge base and RAG

Architecture: [knowledge-base.md](knowledge-base.md). The agreed answer-quality work: [plan 30](planning/30-kb-answer-quality-plan.md).

**Where things stand (2026-11-09).** The library people can download is 2026.10.25: 38 games, 414 notes, 164 Deck tips
and 351 tap-to-define words; the maintainer published it on 2026-10-25 and both channels were read back byte for byte
([the releases table](knowledge-base.md)). The build on this PC is bigger: version 2026.11.04, **583 notes and 167 tips**, every note with its meaning vector (`corpus.db` 4,096,000 bytes). It is not published yet (checked 2026-11-09): the maintainer's publish is owed, and GitHub's copy is still dated 2026-10-25. Every one of the 38 games has an enemy or item note; 15 have them in the labelled short-line shape.  The Deck's own copy is
2026.10.25 (`workshop:test-evidence/plan98-P98-KS-LIBRARY.json`).
The answer test on this PC read facts kept 68.9 in a hundred on the final library (2026-11-03); runs differ by about four points. Older figures: [Detail](roadmap-kb-details.md#plan-103-notes-moved-from-the-knowledge-base-roadmap-2026-11-09)

## Calls waiting on you

- **Your first monthly read of ten replies** — **OPEN, raised 2026-11-03 (plan 102 lane F).**
  Ten whole replies for you to judge: `workshop:archive/research/kb-answer-sample-2026-11-02-p102-reading.md`.
- **Your eye on plan 100's wording** — **OPEN, raised 2026-10-26.**
  The seven Baldur's Gate 3 notes, the two new tips (165, 166), ten plain-word tip edits, and the "Suggest as a tip" line's wording.

- **Your ten-note samples** — **OPEN, raised 2026-11-09 (D140, call 4).**
  One sample of ten random notes for the 125 notes from plans 100 and 102, and one per batch of plan 103; each is added here when its sample file exists.

A new call lands here, one line, with what it decides. Every call already made is
written up in full in [the locked decisions file](audit/maintainer-decisions-locked.md).

## Bugs

- ★ `[KB]` **A notes card ("From bonsAI's own note") was drawn under an answer with the knowledge library switch OFF** — **ACCEPTED, by design: the maintainer's call 2026-10-18 ("That's fine"); found 2026-10-18 (plan 96 block M, Deck).**
  A stopped answer with "Use local knowledge base" off still drew a notes card once, and not on another try. The maintainer's call: that is fine (by design). Evidence `workshop:test-evidence/plan96-P96-R2-STOP-NOCARD-2.json`.
- ★ `[KB]` **On a no-story game named in the question, with nothing running, a cover under Default does not open by itself (Brotato, 2026-11-03)** — **OPEN, found 2026-11-03 (plan 102 Deck block R0).**
  The cover was drawn under Default and stayed shut, as under Hide more. **Cause read 2026-11-09 (plan 103 lane S1):** the rule that opens a cover by itself looks only at the running game, and Brotato is on the no-story list by its Steam number only, in neither name list (screen or back end). Evidence `workshop:test-evidence/plan102-P100-HIDE-MORE-SCREEN-01-try2.json`.
- ★ `[KB]` `[ui]` **A spoiler-covered answer draws no notes chip** — **OPEN, found 2026-11-03 (plan 102 Deck block R1).**
  A Grand Theft Auto IV answer came back as a full spoiler cover and showed no notes chip; the log and the saved chat show the three notes (`workshop:test-evidence/plan102-P102-THIN-GAMES-01.json`). **By design in the code:** the notes line waits while a cover is shut; plan 103 measures it (row P103-M-COVERED-NOTES) and draws a caption (lane S1, D140 call 14). The Fallout 4 computer-terminal sighting is in the other file (`plan102-P102-FINDPC-01.json`) and is a weak-match case (a "No close match" line), not a covered one.
- ★ `[KB]` **In Speed mode, the meaning check on troubleshooting tips never runs** — **ACCEPTED, 2026-09-28.** The
  maintainer chose this on 2026-09-05 to save about a second per Speed question
  ([D62](audit/maintainer-decisions-archive.md#d62--locked-2026-09-05-raised-2026-09-05--the-second-bug-fixing-session-four-calls-before-go)
  item 2). A stray word match can attach a wrong tip. A fix would run the meaning search only when the word hits are thin;
  that needs a cut-off picked and measured. [Detail](roadmap-kb-details.md#speed-mode-tip-gap)
- ★★ `[KB]` `[focus]` **With the panel's page out of focus, Down from the notes block skips the open details panel and lands on the suggestion chips** — **OPEN, found 2026-11-02 (plan 102 lane C, in the test setup; not yet seen on the Deck).**
  After lane C's fix (`1d262a94`, `8ce44695`) Down no longer dies there: the press moves. But the details tabs row and the chip grid have no Steam nodes of their own (plan 97 gave the notes block that), so the ring jumps past the open details panel, a moving press and not yet the stop a person expects. Row P102-UNDO-FOCUS-01 (UNCLEAR on 2026-11-03: the window's focus read true, so the lost-focus state never happened) would read it.
- ★★ `[KB]` `[ui]` **Opening a spoiler cover on one answer lets the notes line show under every answer** — **OPEN, found 2026-11-09 by reading the code (not seen on the Deck).**
  One page-wide "a cover is open" switch decides it, so a protected note's name could show under an answer that is still covered. Plan 103 lane S1.
- ★★ `[KB]` `[ui]` **Up from a checklist's step 1 lands on the Copy reply text icon, and Down from that icon skips the whole step list and lands on Mark reply helpful** — **OPEN, found 2026-11-03 (plan 102 Deck block R0).**
  Down from the answer reaches step 1 and the steps walk as they should; the skip is on the way back. Evidence `workshop:test-evidence/plan102-P98-ROUTE-01-try3.json`.
- ★★ `[KB]` `[QA]` **The answer test's samples are not independent: the same prompt gave the identical reply three times, so three samples can be one** — **OPEN, found 2026-11-02 (plan 102 lane E).**
  No seed is sent with a question, and no answer cache was found in the back end though the lessons file says one exists; plan 103 lane T2 settles it. It makes six questions at 0 of 3 together easy to produce with nothing changed. Report `workshop:archive/research/kb-crowding-read-2026-11-02-p102.md`.
- ★★ `[KB]` **The new notes crowd the old ones: five held-back questions lost their note from the first three after the four games' notes landed** — **MEASURED 2026-10-25 (plan 100 lane X), read 2026-11-02 (plan 102 lane E); the maintainer's call 2026-11-09: build the fix (plan 103 lane R1).**
  **One real cause in the search:** after the 51 notes the word search returns up to ten notes instead of three, which pushes a note found only by meaning down the blend; four of the five lost slots are worse for a player. **Code reading 2026-11-09:** nothing caps the word list near ten (it can run to 30); a note the word search missed is given a place one past the end of that list, so its credit shrinks as the list grows.
  **Final library, 2026-11-03 (lane X2):** one older right note slipped out of the first three (Mario Kart 64), the same cause: [Detail](roadmap-kb-details.md#plan-103-notes-moved-from-the-knowledge-base-roadmap-2026-11-09). Older text: [Detail](roadmap-kb-details.md#plan-102-notes-moved-from-the-knowledge-base-roadmap-2026-11-03)
- ★★ `[KB]` **Unrelated questions can still get a game card stapled on** — **ACCEPTED 2026-08-27.** Raising the word floor costs real matches and the
  model mostly ignores a card that does not fit. Earlier sightings: [Detail](roadmap-kb-details.md#plan-100-notes-moved-from-the-knowledge-base-roadmap-2026-10-25)
  The junk-phrase fix is in [Done](roadmap.md#done-after-v060) since 2026-10-26 (row P100-THANKS-01-try2).
  [D28](audit/maintainer-decisions-archive.md#d28--ordinary-phrases-attach-game-cards-how-hard-should-the-floor-be) ·
  [Detail](roadmap-kb-details.md#ordinary-phrases-attach-game-cards)
- ★★★★ `[KB]` **What ships loses to its own meaning half on questions nobody tuned against** — **ACCEPTED, decided
  2026-09-06.** The finding and its reasons: [Detail](roadmap-kb-details.md#plan-103-notes-moved-from-the-knowledge-base-roadmap-2026-11-09). **Re-measured on the final library (2026-11-03, 583 notes, 628 held-back questions):** blend 92.5 in a hundred, meaning search alone 92.4, word search alone 85.0, a tie ([Detail](roadmap-kb-details.md#plan-103-notes-moved-from-the-knowledge-base-roadmap-2026-11-09)).
  Weights stay even. [D82](audit/maintainer-decisions-locked.md#d82--open-raised-2026-09-06--leaning-the-search-on-meaning-wins-on-the-measurements-and-breaks-three-rules-we-set-on-purpose) · [Detail](roadmap-kb-details.md#the-shipping-retrieval-arm-loses-to-the-vector-half-alone-on-rows-nobody-tuned-against) · the 2026-11-02 sentence: [Detail](roadmap-kb-details.md#plan-102-notes-moved-from-the-knowledge-base-roadmap-2026-11-03)

## Deck check owed

- ★ `[KB]` **Baldur's Gate 3's seven notes: the maintainer's read** — **VERIFY, landed 2026-10-25 (plan 100 lanes N1 to N4), owed to your eye.**
  Seven Wikipedia-only notes (its own wiki is NonCommercial): Owlbear, Githyanki Warriors, Minthara, Goblin Horde, Explosive Barrel, Potions, Weapon Poison. It closes on your read of ten random notes, not of every note (D140, call 4); that sample covers the 125 notes from plans 100 and 102.
  **Deck 2026-10-26, MEASURED (row P100-FOUR-GAMES-01):** the Minthara question attached the Minthara note. [Detail](roadmap-kb-details.md#plan-103-notes-moved-from-the-knowledge-base-roadmap-2026-11-09)
- ★ `[KB]` **The eight thin games' notes: the maintainer's read** — **VERIFY, landed 2026-11-02 (plan 102 lanes N5 to N12); the Deck half passed 2026-11-03; it closes on your read of ten random notes (D140, call 4).**
  118 notes in the labelled shape: Grand Theft Auto V, Grand Theft Auto IV, Super Mario 64, Paper Mario: The Thousand-Year Door, Doom 64, Donkey Kong 64 and Mario Kart 64 15 each, Pikmin 2 13 (landing commits in [Detail](roadmap-kb-details.md#plan-102-notes-moved-from-the-knowledge-base-roadmap-2026-11-03)). [Detail](roadmap-kb-details.md#plan-103-notes-moved-from-the-knowledge-base-roadmap-2026-11-09)
  236 blind questions for them are in the search test (lane Q2, tip `76f3619d`). **Deck 2026-11-03 (block R1, row P102-THIN-GAMES-01), PASSED 8 of 8:** one question per game by name attached a note from the new files (notes 1409, 1502, 1600, 1704, 1814, 1906, 2004, 2108) and the Paper Mario answer gave away no story beat. Evidence `workshop:test-evidence/plan102-P102-THIN-GAMES-01.json`.
- ★★ `[KB]` **Thumbs-down: after Undo with a game running, Down stopped on the notes block** — **VERIFY, landed 2026-11-02 (plan 102 lane C, `1d262a94`, `8ce44695`), unit-tested; UNCLEAR on the Deck 2026-11-03.**
  The thumbs-down rows now ask the panel's window for its focus when the ring lands on them (earlier text: [Detail](roadmap-kb-details.md#plan-103-notes-moved-from-the-knowledge-base-roadmap-2026-11-09)).
  **Deck 2026-11-03 (block R1, row P102-UNDO-FOCUS-01), UNCLEAR, not a pass:** the page's window focus read true in all five reads (the mark and four reopens) with the game running, so the lost-focus state never happened and the Down walk was not run. Evidence `workshop:test-evidence/plan102-P102-UNDO-FOCUS-01.json`. Still owed: the walk itself (row P102-UNDO-FOCUS-01: Show details open, four Downs, the fourth must move); it runs in plan 103 block D0a. Its "before the fix" reading (row P98-DEMOTE-01-game-try2) can no longer be taken, because the fix has been on the Deck's build since 2026-11-03; that half is dropped. Evidence of the first sighting `workshop:test-evidence/plan98-P98-DEMOTE-01-game.json`.
- ★★ `[KB]` `[QA]` **Screenshot reading ignored the game name it was handed** — **VERIFY, landed 2026-11-02 (plan 102 lane D, `71389e3f`, `d755670b`); kept, confirmed by the maintainer, D140 (2026-11-09); row P102-PICTURE-01 is still owed.**
  With a game running and a picture attached, the question now starts "This screenshot is from <game>.", on by default. On the PC the game was named 91 and 92 times in a hundred (67 and 70 before) and the place 29 and 30 (52 and 53 before). Row P102-PICTURE-01 could not run on 2026-11-03: the Deck's own capture (Steam + R1) saved no screenshot in two tries and "Attach recent screenshot" attached nothing, so nothing about the shape was tested (`workshop:test-evidence/plan102-P102-PICTURE-01.json`). Still owed. See the screenshot entry in Next.
- ★★ `[KB]` **A troubleshooting question that only describes the symptom reaches no tips** — **ACCEPTED (D81) for the meaning search; the wording fix landed 2026-10-25 (plan 100 lane T).**
  "The game drops me back to the library" reached no crash tip. The held meaning search stays held. The wording fix is in [Done](roadmap.md#done-after-v060) ("A troubleshooting question mostly never reaches the tips"); the numbers are there. Deck 2026-10-26: row P100-TIPS-01 failed on one of three sentences; the retry P100-TIPS-01-try3 passed.
  The find-my-PC part (tip 167, plan 102 lane H) passed on the Deck 2026-11-03: see Done. Older text: [Detail](roadmap-kb-details.md#plan-100-notes-moved-from-the-knowledge-base-roadmap-2026-10-25)
- ★★ `[KB]` **Hidden spoiler box stays shut on games with no Steam ID and on name-first questions** — **VERIFY, landed
  2026-09-15, unit-tested.** A game known only by name now opens its box, and naming the boss up front keeps the answer in
  plain text. Passed on the Deck: name-first and knowledge base off (earlier rows: [Detail](roadmap-kb-details.md#plan-103-notes-moved-from-the-knowledge-base-roadmap-2026-11-09)).
  **Still owed:** STRAT-SPOIL-NAME-01 could not run again on 2026-11-03 (plan 102 block R0: Doom 64 was not running and a stuck suspend overlay blocked the Home shelf; `workshop:test-evidence/plan102-STRAT-SPOIL-NAME-01.json`): the rig can now launch a shortcut by its title (Deck tools 0.3.12), so the row no longer needs the maintainer's hand launch; plan 103 block D0a tries it. Earlier tries: [Detail](roadmap-kb-details.md#plan-102-notes-moved-from-the-knowledge-base-roadmap-2026-11-03)
  Evidence `workshop:test-evidence/plan79-STRAT-SPOIL-NAME-01.json`. [Detail](roadmap-kb-details.md#hidden-spoiler-box-stays-shut-on-games-with-no-steam-id-and-on-name-first-questions)

## Next

- ★★★ `[KB]` **The AI almost never admits that no note covers the question: 3 and 4 of 24 in two runs** — **OPEN, measured 2026-11-02 and again 2026-11-03 (plan 102 lanes F and X2).**
  On eight questions no note can answer, the AI admitted it in 3 of 24 replies the first time (all three the back end's "No close match" footer, none its own words) and 4 of 24 on the final library, and answered as if it knew in 21 and 20 of 24. The open step is prompt work. Reports `workshop:archive/research/kb-answer-eval-2026-11-02-p102-unknown.md` and `workshop:archive/research/kb-answer-eval-2026-11-03-p102-after.md`. The deeper answer checks that found it are built (Done).
- ★★★ `[KB]` **KB visual maps** — **PARTIAL; two shapes picked on the mock-up board 2026-10-10, the route built 2026-10-24.** Nothing draws anything in a reply today.
  **A route, one step at a time:** built 2026-10-24 (its entry is in Done); the "Needs: …" part was removed 2026-11-03.
  **Your screenshot, marked**: up to three numbered marks (hit, avoid, dodge), each saying whether the Deck's AI is sure; an unsure mark is dashed. A scoring test first: a stronger model scores, out of ten, what the Deck's models mark, and helps teach them.
  Not chosen as drawn: a fuller boss card, a whole-kingdom map.
  [Mock-up board, tab 5](https://claude.ai/artifact/XyZfUSPGRZdm2P3mTGV9tR) · [notes](demos/mockup-board/README.md) · [Detail](roadmap-kb-details.md#kb-visual-maps)
- ★★★ `[KB]` **Mod knowledge for modded games** — **OPEN, filed 2026-10-27 (plan 101, round 4); sources and licences listed 2026-11-02 (plan 102 lane J).** Known mod problems and load-order rules for the games people mod most, so "what's wrong with my load order" and "do these two mods clash" get an offline answer that names the mods bonsAI found on the device. Nexus Mods pages are never copied.
  **Found:** LOOT's rule lists are CC0 (free to use); the Cyberpunk wiki has no licence; Stardew Valley's sources are NonCommercial or mixed ([Detail](roadmap-kb-details.md#plan-103-notes-moved-from-the-knowledge-base-roadmap-2026-11-09)). Report `workshop:planning/assets/101-mod-knowledge-sources.md`.
  **Next step:** written permission from the Cyberpunk wiki's admins, and CC0 in the two checks. **Plan 103** runs the basics tips (plan 101's knowledge-cards lane) and the CC0 change (lanes G1 and T3); the device side stays plan 101's. [Plan 101](planning/101-deep-mod-ai-hints.md) · earlier text: [Detail](roadmap-kb-details.md#plan-102-notes-moved-from-the-knowledge-base-roadmap-2026-11-03)
- ★★★ `[KB]` **Suggestion chips ordered by your last question** — **OPEN, split out of Phase 5's second half by D140 call 7 (2026-11-09).**
  A smarter order for the suggestion chips, so the first ones follow what you just asked. Plan 103 lane C1 builds it if a slot is free late in the session (Deck row P103-CHIP-ORDER-01).
- ★★★★ `[KB]` **KB online / versus strategy content** — **OPEN, discovery locked 2026-08-09.** Multiplayer questions
  (roles, callouts, co-op) get nothing specific today. Plan: new card kinds, Left 4 Dead 2 first, then Counter-Strike 2,
  from archive dumps only. Two to three weeks. **Found 2026-11-09:** some of the August plan's file paths are stale (the spoiler-risk file moved to the spoilers folder); the seven "Playing as" notes it planned already exist under another kind (game mechanic); eight of eighteen versus test questions have no note to find. Plan 103 lanes V1, V2 and Q6 build its first three steps for Left 4 Dead 2; Counter-Strike 2 stays out. [Plan](planning/17-kb-online-versus-strategy-content.md) ·
  [Detail](roadmap-kb-details.md#kb-online--versus-strategy-content-and-rag-phase-5)
- ★★★★ `[KB]` `[QA]` **Measure how well the AI reads a screenshot: which game, which area, which boss** — **PARTIAL, added 2026-09-25. Step 1 done 2026-10-24 (plan 98 lane I); step 2 measured 2026-11-02 (plan 102 lane D).**
  Step 1: a labelled picture set and a scoring script. **Step 2, on this PC:** the picture models the Deck offers read far better than its starter model (qwen3.5:4b named the game 97 and the place 70 times in a hundred, against 67 to 70 and 52 to 53). Figures and reports: [Detail](roadmap-kb-details.md#plan-103-notes-moved-from-the-knowledge-base-roadmap-2026-11-09).
  The set is 11 pictures and none shows a boss; a bigger one needs the maintainer's hand. Still PARTIAL. [Detail](roadmap-kb-details.md#measure-how-well-the-ai-reads-a-screenshot) · older text: [Detail](roadmap-kb-details.md#plan-102-notes-moved-from-the-knowledge-base-roadmap-2026-11-03) · **From Phase 7 (call 8):** a screenshot feeding the search is not built.
- ★★★★ `[KB]` **RAG Phase 5: depth on the thirteen titles** — **PARTIAL.** The thirteen original titles went from 133 to 164 notes; plan 100 and plan 102 added 51 and 118 notes ([Detail](roadmap-kb-details.md#plan-103-notes-moved-from-the-knowledge-base-roadmap-2026-11-09)). Games with those notes in the labelled shape: 15 of 38 (7 before).
  **Measured, final library 2026-11-03:** 230 of the 236 blind questions for plan 102's eight games find their note in the first three (`workshop:archive/research/kb-embed-bakeoff-2026-11-03-arms-p102-after.md`); on the Deck 2026-11-03 their row passed 8 of 8 (Deck check owed). Older results: [Detail](roadmap-kb-details.md#plan-103-notes-moved-from-the-knowledge-base-roadmap-2026-11-09).
  Two small things the lanes left open for you are in [Detail](roadmap-kb-details.md#plan-102-notes-moved-from-the-knowledge-base-roadmap-2026-11-03). [Plan](planning/28-phase5-corpus-depth.md) · [Detail](roadmap-kb-details.md#plan-100-notes-moved-from-the-knowledge-base-roadmap-2026-10-25)
- ★★★★★★ `[KB]` **RAG Phase 8: catalog corpus** — **OPEN, intent only.** The change that gets most people's games real
  notes instead of the model's memory: top 1000 Steam titles, top 100 on Deck, an emulated slice. Months of work.
  **As of 2026-11-09:** the build on this PC has 38 games and 583 notes. [Detail](roadmap-kb-details.md#plan-103-notes-moved-from-the-knowledge-base-roadmap-2026-11-09) · [Detail](roadmap-kb-details.md#rag-phase-8-catalog-corpus) · **From Phase 7 (call 8):** add-on packs come first.
