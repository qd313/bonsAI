# Plan 80, step 1 — findings sheet 5: Verify, the features half

- **Slice:** `docs/roadmap.md`, "Features that need verification" (line 387) up to "Knowledge base and RAG" (line 451).
- **Date:** 2026-10-03. **Checked by:** helper 5 (read-only; no roadmap file was touched).
- **Entries:** 12.
- **Verdicts:** true 7 · stale 5 · done with proof 0 · fixed with no proof 0 · unclear 0.
- **Moves to Done:** none. No entry has a passed Deck check that closes all of it. Every entry still owes something to the Deck or to the maintainer's eye.
- **Stale means the entry's own text is out of date.** Three of them (chips, streamed-answer scramble, frame rate) have newer Deck proof on file that the entry does not mention yet.
- **Commit hashes.** Re-checked after the full history arrived: every hash cited in these entries resolves, and each commit's subject matches what the entry says it built (for example `2975570f` icons on the knowledge-base buttons, `a7fe4ac2` fresher title, `8b414628` calmer rating choices, `2fa5a5a4` and `70a47e4b` long chips, `ec70866b` dots moved up 10 px). This sheet still rests on evidence files, test rows and code.

---

## Icons on the "Update knowledge base" and "Remove" buttons

- **Title and place:** "Icons on the "Update knowledge base" and "Remove" buttons", Verify > Features, line 389. One star, `[ui]`.
- **Verdict:** **true.**
- **Proof:** `src/components/KnowledgeBaseSection.tsx:90` imports the refresh arrow, download arrow and bin icons; line 1098 puts the bin on Remove. Test row `docs/testing.md:285` (P79-KB-BUTTON-ICONS): "Owed (Deck) ... Not run yet." `CHANGELOG.md:22` says "the icons owe their Deck check."
- **Decision owed?** No. The icons were an ask from the maintainer, folded into plan 79 ([D122](audit/maintainer-decisions-locked.md#d122--locked-2026-10-02-raised-2026-10-02--plan-79-the-last-session-before-060-the-ten-calls)); no separate call is open.
- **Test owed?** Yes. Row P79-KB-BUTTON-ICONS in `docs/testing.md:285`. **No evidence exists.**
- **Proposed shorter entry:**
  ```
  - ★ `[ui]` **Icons on the "Update knowledge base" and "Remove" buttons** — **VERIFY, built 2026-10-02, asked for by the maintainer.**
    Update keeps the refresh arrow, Download gets a download arrow, Remove gets a bin. The words and the D-pad order did not change.
    Deck check owed, never run: **P79-KB-BUTTON-ICONS** ([testing.md](testing.md)).
  ```
- **Long notes:** none linked.

## Make the preset chips look more like chips

- **Title and place:** "Make the preset chips look more like chips", Verify > Features, line 391. Two stars, `[chips]`.
- **Verdict:** **stale.** The entry says row 09's "scrolling-label half is still owed". It has passed.
- **Proof:** `docs/test-evidence/plan79-CHIP-BUTTON-09.json` (Deck 2026-10-02, build `f0a4f2c4`, Half-Life 2 running): "Tip chips with an overflowing label were on screen from the first read ... The scrolling half was produced (first time)." Verdict in the file: "PASS - dot moved 0.00 px against 200 px of label movement on 842 reads; 7x7 and before the label every time". Neither `docs/testing.md:206` nor `docs/testing-manual.md:531` (CHIP-BUTTON-09) mentions this file; both still say the scrolling half is owed. Plan 79 (`docs/planning/79-release-wave-six.md:706`) records the same pass ("the Tip dot on a scrolling label (first time produced)"). The rest of the entry matches `docs/testing.md:206`: rows 01 and 05 by eye, the help and agent chips, row 06 partial.
- **Decision owed?** No new one. Built under [D110](audit/maintainer-decisions-locked.md#d110--locked-2026-09-16-raised-2026-09-16--the-suggestion-chips-as-real-buttons-claude-design-board-b-six-calls-before-the-build).
- **Test owed?** Yes, and only by eye: rows CHIP-BUTTON-01 and -05 (the maintainer's look at the screenshots), the help chip and the agent chip (row 06, `docs/testing-manual.md:530`). Evidence so far: `docs/test-evidence/plan60-QA-chip-button.json`, `plan70-L6-CHIP-BUTTON-09.json`, `plan79-CHIP-BUTTON-09.json`, `plan70-L5-FLOW5-REDUCED-MOTION.json`, `plan79-CHIP-BUTTON-07.json`.
- **Proposed shorter entry:**
  ```
  - ★★ `[chips]` **Make the preset chips look more like chips** — **VERIFY, shipped 2026-09-17 (plan 60, D110).**
    Chips look raised and sit closer together; the chip the controller is on has a soft blue fill.
    Passed on the Deck: rows 02 to 04, 06 (one-chip setting), 07 (all three styles) and 08 by measurement, and row 09 (the dot stays still while a long label scrolls, `plan79-CHIP-BUTTON-09.json`, 2026-10-02).
    Still owed: the maintainer's own look at rows 01 and 05, and at the help and agent chips (row 06).
    [Plan](archive/60-chip-button-restyle.md) · [Detail](roadmap-details.md#make-the-preset-chips-look-more-like-chips).
  ```
  (Row numbers for 02 to 06 and 08 are as the current entry says: "Rows 02 to 06 and 08 passed by measurement". Row 06 is only partly proven, so the proposal names its one-chip half only. The writer should check that wording against `docs/testing-manual.md:530`.)
- **Long notes:** "Make the preset chips look more like chips" (`roadmap-details.md:348`). Not read line by line for this sheet beyond the heading; helper 9 covers the long-notes file. The testing rows were updated by hand to match (see Notes) when the roadmap entry is.

## Streamed answers arrive with the same scramble as the decode chips

- **Title and place:** "Streamed answers arrive with the same scramble as the decode chips", Verify > Features, line 402. Two stars, `[reply]`.
- **Verdict:** **stale.** It lists SCR-03 as owed with no number. A run inside a live mission now exists.
- **Proof:** `docs/test-evidence/plan79-SCR-10-MISSION.json` (Deck 2026-10-02, build `f0a4f2c4`, Deep Rock Galactic: Survivor in a live run, stopped on a level-up pick, not mid-fight). Verdict in the file for SCR-03: "UNCLEAR - report only, no written limit: game 45 fps idle, 43 to 44 while answering, panel 69 fps median while writing. The game was on a level-up menu, so it was not under full fight load. The maintainer judges." Everything else in the entry matches `docs/testing.md:241` (DEV-01, SCR-04, 05, 06, 07, 08 pass; SCR-01 owed to the maintainer). `docs/testing.md:241` does not mention the plan 79 mission file.
- **Decision owed?** The maintainer judges SCR-03 (the evidence file's own words). Background: [D119](audit/maintainer-decisions-locked.md#d119--locked-2026-09-24-raised-2026-09-24--plan-69-streamed-answers-scramble-into-place-the-calls-from-discovery). No decision recorded on what frame rate is acceptable beside a game.
- **Test owed?** Yes. SCR-01, the maintainer's look. SCR-03 has a reading but needs the maintainer's judgement; a run in a real fight is not on file. Evidence: `plan79-SCR-10-MISSION.json`, `plan70-L5-FLOW3-DRG.json`.
- **Proposed shorter entry:**
  ```
  - ★★ `[reply]` **Streamed answers arrive with the same scramble as the decode chips** — **VERIFY, built 2026-09-24/25 (plan 69, D119).**
    A Developer tab switch, *Scramble animation*, off by default, churns a live answer's newest letters through placeholder symbols before they settle, as a suggestion chip does.
    Passed on the Deck: DEV-01, SCR-04 to SCR-08 (SCR-05 and SCR-07 on 2026-09-26).
    Owed: the look (SCR-01, the maintainer's eye) and the maintainer's verdict on the game's own frame rate (SCR-03: 43 to 45 while answering, game stopped on a menu, `plan79-SCR-10-MISSION.json`).
    Full rows in [testing.md](testing.md).
  ```
- **Long notes:** none linked (plan 69 is linked).

## The streamed answer's own redraws were costing most of the panel's frame rate

- **Title and place:** "The streamed answer's own redraws were costing most of the panel's frame rate", Verify > Features, line 410. Two stars, `[reply]`.
- **Verdict:** **stale.** It says a run "with a game in a mission" is owed. That run has been done and passed.
- **Proof:** `docs/test-evidence/plan79-SCR-10-MISSION.json`: "PASS (SCR-10) - answer-phase median 68.8 and 69.6 on the two answers, lowest slice 64.5 and 63.8; both far over 30. Reached a live mission for the first time." Caveat from the same file: the game stood on a level-up choice screen, "not mid-fight". Earlier proof stays: `docs/test-evidence/plan69-answer-frame-rate-2026-09-25.json` (56–58 with scramble off, 44–50 with it on, no game), `plan76-SCR-10-try2.json` (title screen, 84.5). Rows SCR-09 and SCR-10 are in `docs/testing.md:241`, which does not mention the plan 79 file. Not found: any file saying which scramble setting was on during the mission run ("Scramble setting as found").
- **Decision owed?** No. The maintainer's floor of 45 was set earlier (plan 69); no separate decision heading found.
- **Test owed?** Partly. The maintainer's own look. Not on file: a run in a real fight, and the scramble setting used in the mission run. Evidence: the three files above.
- **Proposed shorter entry:**
  ```
  - ★★ `[reply]` **The streamed answer's own redraws were costing most of the panel's frame rate** — **VERIFY, fixed 2026-09-25.**
    With no game running the panel drew 19–24 frames a second while an answer streamed. It now draws 56–58 with the scramble off and 44–50 with it on (floor 45).
    With a game in a live mission (stopped on a menu, 2026-10-02) the panel drew about 69 a second while answers arrived.
    Owed: the maintainer's eye on the look, and a run mid-fight. Rows **SCR-09**, **SCR-10** in [testing.md](testing.md); evidence `plan69-answer-frame-rate-2026-09-25.json`, `plan79-SCR-10-MISSION.json`.
  ```
- **Long notes:** none linked.

## Kids master lock

- **Title and place:** "Kids master lock", Verify > Features, line 417. Three stars, `[perms]`.
- **Verdict:** **true.** Nothing new on file.
- **Proof:** `docs/testing.md:192` (Open; KIDS-LOCK-01, KIDS-LOCK-02, KIDS-FOCUS-01, KIDS-REGRESS-01) and `docs/test-evidence/plan57-QA-KIDS-REGRESS-01.json`: "With no parental controls on this Deck, the Permissions page shows no lock banner and all four switches are on and reachable with the D-pad". The spike results the entry cites are `archive/08-kids-master-lock-feasibility.md`.
- **Decision owed?** No decision recorded.
- **Test owed?** Yes. KIDS-LOCK-01, KIDS-FOCUS-01 (both need a locked Family View account on a spare adult account), KIDS-LOCK-02 (child account), and the live Steam check. **No evidence exists** for those; only KIDS-REGRESS-01 has proof. The checks cannot be run without a parent-locked Steam account.
- **Proposed shorter entry:**
  ```
  - ★★★ `[perms]` **Kids master lock** — **VERIFY.** Shipped 2026-08-09.
    When Steam says parental controls are locked, bonsAI turns the high-impact permissions off and greys their switches.
    Passed on the Deck 2026-09-17: with no lock set, no banner and all four switches on and reachable (KIDS-REGRESS-01, `plan57-QA-KIDS-REGRESS-01.json`).
    Still owed, needs a locked account: KIDS-LOCK-01, KIDS-FOCUS-01, KIDS-LOCK-02 (child account), and the live Steam check.
  ```
- **Long notes:** none linked.

## The open tab strip redrawn: six equal cells, one icon family, only the current tab named

- **Title and place:** "The open tab strip redrawn: six equal cells, one icon family, only the current tab named", Verify > Features, line 419. Three stars, `[tabs]` `[ui]`.
- **Verdict:** **stale.** Three things.
  1. "the strip is taller so the chat row's dots no longer show under it" is out of date: the 2026-09-21 fix moved the dots up 10 px, "rather than the strip growing" (`docs/testing-manual.md:574`).
  2. "07 failed and is filed as its own bug above": row 07 failed again on 2026-09-23 (the dots now touch the chat name, 0.2 px gap) and the manual says it "Moved back to Bugs, OPEN, with a maintainer's pick needed among three ways out". **No such entry exists in the roadmap today** (searched for "dots", "sliver", "chat name", "three ways", "2A-07"). Either it was dropped by mistake or it lives somewhere I did not find.
  3. The 2026-09-23 free-play wording matches `docs/testing.md:189`; fine.
- **Proof:** `docs/testing-manual.md:574` (TAB-STRIP-2A-07, fail 2026-09-18, fixed `ec70866`, fail again 2026-09-23, screenshot `docs/test-evidence/plan64-BYEYE-01-chat-row.png`); `docs/testing.md:189`; `docs/test-evidence/plan61-TAB-STRIP-2A-01.json` to `-07.json`; `docs/testing-manual.md:573` (row 03 still owed the maintainer's look).
- **Decision owed?** Yes. The three ways out for row 07 (leave as is; move the dots back 1 px; hide them while the strip is open) need a maintainer pick. No decision recorded for it. Design call: [D109](audit/maintainer-decisions-locked.md#d109--locked-2026-09-16-raised-2026-09-16--the-open-tab-strip-redesign-claude-design-board-2a-approve-the-drawing-and-three-small-calls).
- **Test owed?** Yes. Row TAB-STRIP-2A-03 (by eye) and TAB-STRIP-2A-07 (fails; needs the pick, then a re-run). Evidence: `plan61-TAB-STRIP-2A-03.json`, `plan61-TAB-STRIP-2A-07.json`, `plan64-BYEYE-01-chat-row.png`.
- **Proposed shorter entry:**
  ```
  - ★★★ `[tabs]` `[ui]` **The open tab strip redrawn: six equal cells, one icon family, only the current tab named** — **VERIFY, landed 2026-09-17.**
    Six equal cells, one icon each, only the current tab named. Deck 2026-09-18: rows 01, 02, 04, 05, 06 pass. The streaming half of the free-play sweep closed 2026-09-23.
    Owed: row 03 (the maintainer's look). Row 07 (the chat row's dots under the strip) failed again 2026-09-23: the dots now touch the chat name. A maintainer pick is owed among three ways out (D109 is the design call; no decision recorded for the pick).
    [Detail](roadmap-details.md#the-open-tab-strip-redrawn-six-equal-cells-one-icon-family-only-the-current-tab-named) · [Tab icon](roadmap-details.md#replace-the-bonsai-tab-icon).
  ```
- **Long notes:** "The open tab strip redrawn..." (`roadmap-details.md:1578`) is marked "Moved out of the roadmap on 2026-09-21, superseded by the current summary there" and still says "the strip is taller (66px)" and "filed as its own Bugs entry, above". Keep: the goal paragraph (six cells, one 22 px icon, only the current tab named, accent colour). Archive: the commit list, the "Deck run" sentence and the design handoff link (move to the archive; the roadmap entry carries the current state). "Replace the bonsAI tab icon" (`roadmap-details.md:599`): not read for this sheet.

## Named chat slots

- **Title and place:** "Named chat slots", Verify > Features, line 426. Five stars, `[chat]`.
- **Verdict:** **true.**
- **Proof:** `docs/testing.md:210` agrees line by line: 05b, 06c (fourth try 2026-09-23) and 15d passed; 05a busy half, 06a, 06b failed 2026-09-18 and are not re-run; the bug is on the watch list (roadmap line 695, "A chat that is still writing does not look busy from another chat"). Evidence: `docs/test-evidence/plan61-CHAT-SLOTS-V3-05a-busyhalf.json`, `-06a.json`, `-06b.json`, `plan64-CHAT-SLOTS-V3-06c-try4.json`, `plan64-CHAT-SLOTS-V3-15d.json`. The link "Detail" goes to `archive/roadmap-completed.md#moved-from-the-roadmap-2026-09-02`; that heading exists (line 1121).
- **Decision owed?** No decision recorded.
- **Test owed?** Yes: 05a busy half, 06a, 06b are failed and not re-run (they wait for the watch-list bug to show again); the remaining V3 rows are in `docs/testing-manual.md:462`. Evidence is the files above.
- **Proposed shorter entry:**
  ```
  - ★★★★★ `[chat]` **Named chat slots** — **VERIFY.** Redesign v3 landed 2026-08-30: slot row, transcript, presets, Ask bar.
    Passed on the Deck: 05b, 15d, and 06c (fourth try, 2026-09-23). Failed 2026-09-18 and not re-run: 05a's busy half, 06a, 06b. The bug behind them is on the watch list (it did not reproduce in two clean sessions).
    [Detail](archive/roadmap-completed.md#moved-from-the-roadmap-2026-09-02) · [More](roadmap-details.md#named-chat-slots).
  ```
- **Long notes:** "Named chat slots" (`roadmap-details.md:1306`) not read for this sheet beyond the heading; helper 9 covers it.

## Summing up offers a fresher title

- **Title and place:** "Summing up offers a fresher title", Verify > Features, line 431. Two stars, `[chat]`.
- **Verdict:** **true.**
- **Proof:** `docs/test-evidence/plan79-P79-FRESHER-TITLE.json` (build `d810328b`): offer card PASS ("Rename this chat to ...?" with Rename and Keep, the D-pad reached both, Keep removed the offer, title unchanged); button route "COULD NOT RUN - the Sum up button was greyed". The entry says exactly that. Pressing Rename: no evidence of it. `docs/testing.md:298` agrees.
- **Decision owed?** No. [D122](audit/maintainer-decisions-locked.md#d122--locked-2026-10-02-raised-2026-10-02--plan-79-the-last-session-before-060-the-ten-calls), call 6.
- **Test owed?** Yes: pressing Rename; the Sum up button route. Row P79-FRESHER-TITLE; evidence `plan79-P79-FRESHER-TITLE.json` (covers only the offer card and Keep).
- **Proposed shorter entry:**
  ```
  - ★★ `[chat]` **Summing up offers a fresher title** — **VERIFY, built 2026-10-02 (plan 79, D122 call 6).**
    When the AI judges a chat's title stale, the summary card ends with "Rename this chat to ...?" with Rename and Keep. A chat renamed by hand is never offered one.
    Passed on the Deck 2026-10-02: the offer from the automatic summing-up, both buttons reachable, Keep leaves the title.
    Still owed: pressing Rename, and the Sum up button route (greyed that day). Row **P79-FRESHER-TITLE**, evidence `plan79-P79-FRESHER-TITLE.json`.
  ```
- **Long notes:** none linked.

## Calmer rating choices under an answer

- **Title and place:** "Calmer rating choices under an answer", Verify > Features, line 436. Two stars, `[ui]`.
- **Verdict:** **true.**
- **Proof:** `docs/test-evidence/plan79-P79-M7-RATING-ROW-AFTER.json` (build `d810328b`): "PASS - all four landing rules hold (5 of 5 for the speaker), sizes are 28 / 24 / 11 px, ring drawn on Too long." Test file `src/styles/sections/replyRatingChoices.test.ts` exists (not run here). The entry's statement that colours were not measured against the drawing matches the file (sizes only). Row P79-M7-RATING-ROW is Done (`docs/testing.md:290`).
- **Decision owed?** No. The maintainer's pick (drawing 2) is in [D122](audit/maintainer-decisions-locked.md#d122--locked-2026-10-02-raised-2026-10-02--plan-79-the-last-session-before-060-the-ten-calls) ("Picks from the drawings").
- **Test owed?** Yes: the look, the maintainer's eye. **No evidence exists** for a colour check against the drawing. The "wider rule (look for other loud spots)" is open, with no file found.
- **Proposed shorter entry:**
  ```
  - ★★ `[ui]` **Calmer rating choices under an answer** — **VERIFY, built 2026-10-02 (plan 79), the maintainer picked drawing 2.**
    Helpful, Not really and the "What went wrong?" choices are smaller and softer: thumbs 28 px, reasons 24 px, words 11 px. The D-pad walk has no dead press (P79-M7-RATING-ROW, in Done).
    Owed: the look is the maintainer's to judge; colours were not measured. The wider rule (look for other loud spots) stays open.
    Evidence `plan79-P79-M7-RATING-ROW-AFTER.json`.
  ```
- **Long notes:** none linked.

## Fold the "Models & routing" section into the AI models box

- **Title and place:** "Fold the "Models & routing" section into the AI models box", Verify > Features, line 441. Three stars, `[ollama]`.
- **Verdict:** **true.**
- **Proof:** `docs/test-evidence/plan79-P79-MODELS-TRY-ORDER.json` (build `6e297645`): PASS a, b, d, e (switch only); "COULD NOT RUN c - only one answering model is installed"; "COULD NOT RUN - Skipped: too big, and the PC half". The entry says the same. `docs/testing.md:308` agrees. Commit `24708949` resolves.
- **Decision owed?** No for the pick ([D122](audit/maintainer-decisions-locked.md#d122--locked-2026-10-02-raised-2026-10-02--plan-79-the-last-session-before-060-the-ten-calls), "Pick ... option C"). Plan 79 question 2 (`docs/planning/79-release-wave-six.md:415`, option C with the AI on a PC) and question 7 (a Reset order button) are open questions to the maintainer; no locked decision heading for them.
- **Test owed?** Yes: moving a model to another place (needs a second answering model), the "Skipped: too big" label, and the half with the AI on a PC. Row P79-MODELS-TRY-ORDER; evidence `plan79-P79-MODELS-TRY-ORDER.json`.
- **Proposed shorter entry:**
  ```
  - ★★★ `[ollama]` **Fold the "Models & routing" section into the AI models box** — **VERIFY, built 2026-10-02 (plan 79, the maintainer's pick, option C).**
    The Ollama tab has one "AI models" button. In the box each installed model shows its place in the try order with up and down buttons; a Text / Pictures switch picks the order; "Reset order" asks first. The two old try-order screens are gone.
    Passed on the Deck 2026-10-02: opening and closing the box, the Try order row and its arrows, Reset order, the switch.
    Still owed: moving a model to another place (one answering model installed), the "Skipped: too big" label, and the AI on a PC. Row **P79-MODELS-TRY-ORDER**, evidence `plan79-P79-MODELS-TRY-ORDER.json`.
  ```
- **Long notes:** none linked.

## While reading an answer, the Show details line takes the suggestion chip's place above the question box

- **Title and place:** "While reading an answer, the Show details line takes the suggestion chip's place above the question box", Verify > Features, line 446. Three stars, `[layout]` `[focus]` `[chips]`.
- **Verdict:** **true.**
- **Proof:** `docs/test-evidence/plan79-P79-DETAILS-SLOT.json` (build `c98f749e`): steps 1, 2, 5, 6a, 7 PASS; steps 3, 4, 6b UNCLEAR, in the file's own words ("could not place the ring on the question box with the real line hidden below", "could not press A on a 'Show details' slot line", "117 px down because the shorter closed answer is already at its scroll limit"). Test file `src/features/details-slot/DetailsSlot.deck.test.tsx` exists. `docs/testing.md:309` agrees. Commit `5a19a558` resolves ("While reading an answer, its Show details line takes the chip's place").
- **Decision owed?** No for the pick ([D122](audit/maintainer-decisions-locked.md#d122--locked-2026-10-02-raised-2026-10-02--plan-79-the-last-session-before-060-the-ten-calls), "way 2"). Plan 79 question 14 (where build and drawing differ, `docs/planning/79-release-wave-six.md:457`) is open; no locked decision heading.
- **Test owed?** Yes: steps 3 and 4 (right-stick scroll, the maintainer's hand check, "checks page, Friday check 4") and the 8 px close landing. Row P79-SHOW-DETAILS-SLOT; evidence `plan79-P79-DETAILS-SLOT.json`.
- **Proposed shorter entry:**
  ```
  - ★★★ `[layout]` `[focus]` `[chips]` **While reading an answer, the Show details line takes the suggestion chip's place above the question box** — **VERIFY, built 2026-10-02 (plan 79, the maintainer's pick: way 2, a short cross-fade).**
    While the answer's own Show details line is out of sight, that line sits in the chip's place. Once the real line is on screen the chip comes back.
    Passed on the Deck 2026-10-02: the slot's wording, the chip's return, B closing details with the ring staying, Up from the slot or a chip.
    Still owed: reaching the slot's line from the question box and pressing A on it (needs a right-stick scroll, the maintainer's hand check); the 8 px landing after closing.
    Row **P79-SHOW-DETAILS-SLOT**, evidence `plan79-P79-DETAILS-SLOT.json`. Tests: `src/features/details-slot/DetailsSlot.deck.test.tsx`.
  ```
- **Long notes:** none linked.

## Long suggestion chips: pause at the end, centred text

- **Title and place:** "Long suggestion chips: pause at the end, centred text", Verify > Features, line 449. Two stars, `[chips]`.
- **Verdict:** **true.** The entry's facts match the evidence. It reads softer than the evidence verdict, which says FAIL on the pause.
- **Proof:** `docs/test-evidence/plan79-P79-LONG-CHIP-PAUSE.json` (build `678aaa3d`): "FAIL (long chip) - the words do scroll to the end and stand still, but the chip stays 3.2 to 10.2 s after they stop, never 1.2 to 1.9 s. The 1.5 s wait I measured is at the START of each chip, before it scrolls." Centring: "COULD NOT RUN ... shortest words 131 px in a 130 px box". `docs/testing.md:302` agrees. Soft blue fill passed and is in Done (P79-CHIP-SOFT-FILL, `plan79-P79-CHIP-SOFT-FILL.json`).
- **Decision owed?** Yes. Plan 79 question 12 (`docs/planning/79-release-wave-six.md:446`): which pause was meant. **No locked decision heading yet** ("no decision recorded"); it is an open question inside the plan file.
- **Test owed?** Yes: the pause after the maintainer answers, and centring of a short chip (no short chip was on screen). Row P79-LONG-CHIPS; evidence `plan79-P79-LONG-CHIP-PAUSE.json`.
- **Proposed shorter entry:**
  ```
  - ★★ `[chips]` **Long suggestion chips: pause at the end, centred text** — **VERIFY, built 2026-10-02 (plan 79), asked for by the maintainer 2026-10-02.**
    Deck 2026-10-02: the words scroll to their end and stand still, but the chip leaves 3.2 to 10.2 s later, not after about 1.5 s. The 1.5 s wait seen is at the start. **Open question for the maintainer** (plan 79, question 12; no decision recorded): which pause was meant.
    Centring a short chip could not be measured (every chip was longer than its box). The soft blue fill passed and is in Done.
    Row **P79-LONG-CHIPS**, evidence `plan79-P79-LONG-CHIP-PAUSE.json`. Tests: `src/styles/presetChipFocusRing.test.ts`.
  ```
- **Long notes:** none linked.

---

## Notes for the review

1. **No entry in this slice can move to Done.** Each one still owes either a Deck check that has no evidence or the maintainer's own eye. The two new passes below shrink what is owed but do not close an entry.
2. **Two Deck results from 2026-10-02 are on file but not in the test documents or the roadmap.**
   - `docs/test-evidence/plan79-CHIP-BUTTON-09.json` (the dot stays put on a scrolling label: PASS). `docs/testing.md:206` and `docs/testing-manual.md:531` still say it is owed.
   - `docs/test-evidence/plan79-SCR-10-MISSION.json` (frame rate in a live mission: SCR-10 and GAME-LIGHT-01 PASS, STREAM-PIECES-01 and SCR-03 UNCLEAR). `docs/testing.md:238` and `:241` stop at the 2026-10-01 "could not run" note.
   - The sweep that applies this plan should update those rows too, naming the file in each row. I did not touch them (read-only step).
3. **GAME-LIGHT-01 and STREAM-PIECES-01** are rows the mission file settles or leaves unclear (`docs/testing.md:238`). They sit outside this slice; helper 4 or the writer should see them. STREAM-PIECES-01 is unclear because neither answer reached 2,000 letters (1,700 and 1,635).
4. **A missing bug entry (tab strip row 07).** The roadmap says it is "filed as its own bug above"; I found none. The testing manual says it went back to Bugs as OPEN with a pick needed among three ways out. Ask the maintainer whether it was dropped by mistake. If it was, it needs re-filing before the tidy hides it.
5. **Hashes:** all re-checked and resolve (see header).
6. **Open maintainer questions that have no locked decision yet** (all inside plan 79's questions list, `docs/planning/79-release-wave-six.md` around lines 410 to 460): question 12 (long chip pause), question 2 (option C with the AI on a PC), question 7 (Reset order button), question 14 (Show details slot differences). The entries cannot link to a locked heading for these; the plan said they wait for the maintainer.
7. **The chip entry's proposed row list** needs a check against `docs/testing-manual.md:528-531`, because row 06 is only half proven (one-chip setting).
8. **The two scramble and frame-rate entries cannot be tied to which scramble setting the mission run used.** The evidence says "Scramble setting as found"; no file says what was found.
