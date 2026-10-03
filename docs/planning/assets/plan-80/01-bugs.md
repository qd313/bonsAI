# Plan 80, step 1 — findings sheet 01: the roadmap's Bugs section

- Slice: `docs/roadmap.md`, from "## Bugs" (line 56) to "## Features" (line 134).
- Date: 2026-10-03. Branch checked: `experimental`. Full history fetched (2,369 commits); every commit hash cited below resolves.
- Entries: 20.
- Verdicts: **true 17**, **unclear 3** (entries 3, 7 and 16), stale 0, done with proof 0, fixed with no proof 0.
- No entry moves section. No status word changes. Two entries carry small wording fixes (entries 10 and 18).

Decision links are relative to `docs/roadmap.md`.

## The walk check calls a stop hidden when a corner icon merely overlaps its box

- **Title / place:** same title; Bugs, roadmap line 59.
- **Verdict:** true.
- **Proof:** `docs/test-evidence/plan63-CORNER-ICON-COVERAGE-01.json` (verdict in its own words: "NEITHER IS A DEFECT. Both are the walking tool measuring an element's rectangle rather than its words"; the Retry icon ends at x 114, the words start at x 120). The 2026-10-01 note (7 by 3 px overlap) is in `docs/roadmap-details.md` line 2927, evidence `docs/test-evidence/plan78-QA-FREE-PLAY-01-NOGAME.json`. Evidence of the false alarm still showing: `docs/test-evidence/plan79-P79-UP-MIRRORS-DOWN-WORDS-try2.json` ("Copy icon and Retry icon overlaps (89%, 78%) are the two known false alarms"). No later commit changes the check.
- **Decision owed?** No decision recorded.
- **Test owed?** No. It is a note about the test tool, not about the plugin.
- **Proposed shorter entry:**
  - ★ `[QA]` **The walk check calls a stop hidden when a corner icon only overlaps its box** — **OPEN, measured on the Deck 2026-09-21.**
  - The check samples a box, not the words. The question row and the last answer section read part-hidden behind the Retry and Copy icons, though the words clear them (6 px at Retry; the last line only touches Copy by its line spacing, 7 by 3 px on 2026-10-01).
  - Until the check reads text, measure the text before filing. Evidence `docs/test-evidence/plan63-CORNER-ICON-COVERAGE-01.json`. Full note: [roadmap-details.md](roadmap-details.md#the-walk-check-calls-a-stop-hidden-when-a-corner-icon-merely-overlaps-its-box).
- **Long notes:** the heading holds only the 2026-10-01 note ("compared by the text's own line box..."). Keep it; it is one line. Nothing to archive. The sentence in the entry about "two entries filed and withdrawn the same night" can go to the archive; it is history.

## Steam's own scroll keeps a top margin even for a stop already on screen, which the test setup does not model

- **Title / place:** same title (the roadmap's wording: "Steam's own scroll keeps a top margin even for a stop already on screen, which the test setup does not model"); Bugs, line 68.
- **Verdict:** true (as a note).
- **Proof:** the test setup's model of Steam's scroll is `src/test-harness/deckAnswerWalk.ts:38` and `:88-97` (it models 80 px of bottom padding and the end landing; no top margin). The fix it was found beside is `84cc0029`. No Deck evidence exists for the y 104 to y 204 figure in the entry; it is only in the roadmap.
- **Decision owed?** No decision recorded.
- **Test owed?** No evidence exists; the entry says no player-visible fault is known.
- **Proposed shorter entry:**
  - ★ `[focus]` **Steam's own scroll keeps a top margin even for a stop already on screen; the test setup does not model it** — **OPEN, found 2026-09-30 in the test setup, not seen on the Deck.**
  - On the Deck a cover the walk placed at y 104 ended at y 204. No player-visible fault is known. A note so the next walk fix knows. Found beside `84cc0029`.
- **Long notes:** none linked.

## Walking Up can land on a section taller than the screen with only a sliver of it showing at the top

- **Title / place:** same title; Bugs, line 70.
- **Verdict:** unclear. Why: the entry was filed on 2026-09-30 from the test setup. Since then plan 79 changed where an Up landing is placed (`17a54809`, `156baf42`, `c1efd8e8`), and the Deck passed the Up walks on three answers (testing.md rows P79-UP-MIRRORS-DOWN-NEWEST-CLOSED line 313 and P79-UP-MIRRORS-DOWN-WORDS line 315). Nothing in the repo says whether a section taller than the screen can still land with 1 to 8 px showing. Plan 79 line 150 still lists it "for after the release".
- **Proof:** the three commits above; `docs/test-evidence/plan79-P79-UP-LANDING-VISIBLE.json`; `docs/planning/79-release-wave-six.md` line 150. No evidence names the sliver itself.
- **Decision owed?** No decision recorded (plan 79 only says "after the release").
- **Test owed?** Yes, but only to settle the unclear point: run the test setup's Up walk on a tall section (`src/test-harness/deckAnswerWalk.ts`). No evidence exists.
- **Proposed shorter entry:**
  - ★ `[focus]` **Walking Up can land on a section taller than the screen with only a sliver showing at the top** — **OPEN, found 2026-09-30 in the test setup, not seen on the Deck; may be changed by the plan 79 Up fixes, not re-measured.**
  - Only 1 to 8 px showed. It passes the "bottom edge showing" rule but looks poor. For after the release.
- **Long notes:** none linked.

## Walking Up onto a tall first answer section shows only its top third above the dock

- **Title / place:** same title; Bugs, line 72.
- **Verdict:** true.
- **Proof:** `docs/test-evidence/plan79-P79-UP-MIRRORS-DOWN-WORDS-try2.json`, build `156baf42`: "Up lands on answer section 1 ... only about a third (33%) is above the dock ... On the Down leg the same stop sat at y128-353, 67% visible. Not a mirror problem". The commit exists and is the build named.
- **Decision owed?** No decision recorded.
- **Test owed?** The evidence file exists. A re-check is owed only after a fix lands.
- **Proposed shorter entry:** the current entry is already three lines. Keep it as is.
- **Long notes:** none linked.

## The plugin's own claim of the ring when the panel reopens may not run after a switch between Quick Access tabs

- **Title / place:** same title; Bugs, line 74.
- **Verdict:** true (as a suspicion, labelled so in the entry).
- **Proof:** the reopen listener is the second effect in `src/hooks/useAskBarInitialRingClaim.ts:83-107`; the first effect (lines 60-77) only runs once on mount. Whether it is mounted while another Quick Access tab is showing was not settled by reading. Plan 79 line 532 repeats the entry. No evidence file.
- **Decision owed?** No decision recorded.
- **Test owed?** Yes, a Deck check before anything is built. No evidence exists.
- **Proposed shorter entry:**
  - ★ `[focus]` **The plugin's own claim of the ring when the panel reopens may not run after a switch between Quick Access tabs** — **OPEN, found 2026-10-02 (plan 79); needs a Deck check before anything is built.**
  - Only a suspicion from reading the code (`useAskBarInitialRingClaim.ts`). No evidence file.
- **Long notes:** none linked.

## Some controls get only a thin grey frame, and the Steam Web API key field gets no ring

- **Title / place:** same title; Bugs, line 76.
- **Verdict:** true.
- **Proof:** `docs/test-evidence/plan79-P79-RING-WALK-TABS.json` (build `678aaa3d`): "the accent button and Reinstall voice engine get only a thin grey frame"; "Steam Web API key field: filled white with dark text ... no ring, but a clear change"; the base.en voice row shows a thin grey rectangle round the whole row. Verdict in the file: PASS for every stop.
- **Decision owed?** No decision recorded. (Plan 79 line 148 calls the ring "looking slightly different from Steam's own" accepted for 0.6.0; that is not a locked decision.)
- **Test owed?** No; the evidence file exists. A re-check is owed after a fix.
- **Proposed shorter entry:** keep as is (four lines).
- **Long notes:** none linked.

## An underlined game word's own tooltip can cover the word itself

- **Title / place:** same title; Bugs, line 79.
- **Verdict:** unclear. Why: the first Deck sweep (build `49fc8894`) saw the second word at 33 percent with a tooltip box over it, going Down. The second sweep on build `156baf42` shows both words at 100 percent going Down. No commit names the tooltip, so this is not "fixed". It may be the walk's changed order, or it may come and go.
- **Proof:** `docs/test-evidence/plan79-P79-UP-MIRRORS-DOWN-WORDS.json` (word 'Overclocks' (33%: a tooltip box drawn over it)); `docs/test-evidence/plan79-P79-UP-MIRRORS-DOWN-WORDS-try2.json` (word 'Overclocks' (100%), both legs). No test row for the tooltip.
- **Decision owed?** No decision recorded.
- **Test owed?** Yes, a Deck check with a game running, to see whether the cover returns. No evidence exists beyond the two files above.
- **Proposed shorter entry:**
  - ★ `[focus]` **An underlined game word's own tooltip can cover the word itself** — **OPEN, seen once on the Deck 2026-10-02 (build `49fc8894`); not seen again on build `156baf42`.**
  - Walking Down, the second underlined word was a stop with 33 percent showing because a tooltip box covered it. The next sweep showed both words whole. No fix aimed at it. Evidence `docs/test-evidence/plan79-P79-UP-MIRRORS-DOWN-WORDS.json`, `...-try2.json`.
- **Long notes:** none linked.

## The step that lifts a control clear of the dock moves it about 80 px too far

- **Title / place:** same title; Bugs, line 81.
- **Verdict:** true.
- **Proof:** `docs/test-evidence/plan78-P78-DOWN-SHORT-SECTION.json` (a 180 px first section left at y 24 to 204 with the dock at 290; Steam's 80 px of padding). The test setup models the 80 px at `src/test-harness/deckAnswerWalk.ts:38,97`. `b417c271` exists ("The D-pad no longer loops or jumps while reading a long answer section"). Plan 79 line 150 lists it "for after the release". No later commit changes the lift margin.
- **Decision owed?** No decision recorded ("for after the release" is the session's wording).
- **Test owed?** No; the evidence file exists. A re-measure of every landing below an answer is owed after a fix.
- **Proposed shorter entry:**
  - ★ `[layout]` **The step that lifts a control clear of the dock moves it about 80 px too far** — **OPEN, measured 2026-10-01 (plan 78).**
  - The choices and Helpful under an answer land at y 172 to 204 with the dock at 290. Harmless under about 116 px tall; answer sections are exempt since `b417c271`. Cure: take Steam's 80 px out of the lift's margin and re-measure. After the release. Evidence `docs/test-evidence/plan78-P78-DOWN-SHORT-SECTION.json`.
- **Long notes:** none linked.

## While an answer arrives, the start of a sentence that ends up behind a spoiler cover can be read for about a second

- **Title / place:** same title; Bugs, line 83.
- **Verdict:** true.
- **Proof:** `docs/test-evidence/plan78-P78-BORROWED-RUNNING-GAME.json`: "The hidden block's own words were readable in the live text. Reads at 50151 ... 51125 ms (5 reads, about 1 s)"; and the 250 ms read "66 letters shorter ... the very next read had it back". Note for review: the evidence says the hidden block's own words were readable (the start of the block), while the roadmap says "the words shown held no protected name". The plan 78 question 12 says the same as the roadmap. Both can be true; the evidence file is the stronger wording.
- **Decision owed?** Yes, it is an open question: plan 78, question 12 ("fine as it is, or a bug for after the release"), `planning/78-release-wave-five.md` line 442. No locked decision exists. Link: `planning/78-release-wave-five.md` (no heading of its own for the question).
- **Test owed?** No; the evidence file exists.
- **Proposed shorter entry:**
  - ★ `[reply]` **While an answer arrives, the start of a sentence behind a spoiler cover can be read for about a second** — **OPEN, seen 2026-10-01 on the Deck (plan 78), a note. Waiting on the maintainer's call (plan 78, question 12).**
  - The words read held no protected name; the name arrived after the words were hidden. Not known whether it was always so. Evidence `docs/test-evidence/plan78-P78-BORROWED-RUNNING-GAME.json`.
- **Long notes:** none linked.

## After the release: the AI's own instructions write the hidden-block label in the odd shape

- **Title / place:** same title; Bugs, line 85.
- **Verdict:** true, but the line numbers in the entry are stale.
- **Proof:** the shape "```bonsai-spoiler```" is still in `py_modules/backend/services/ollama_prompts.py:483` and in `py_modules/backend/services/strategy_spoiler_policy.py` at lines 139, 150, 161 and 165 (the entry says 138, 149, 160, 164, 271). Line 272 holds "```bonsai-spoiler ... ```", a different shape. The fix of the reader is `09bf7fd7`. Plan 78 question 13 (`planning/78-release-wave-five.md` lines 446-453) recommends rewording after the release.
- **Decision owed?** Yes, open: plan 78 question 13. No locked decision exists. Link: `planning/78-release-wave-five.md` (question 13, no heading of its own).
- **Test owed?** Yes: a before-and-after count of covers on the Deck once reworded. No evidence exists.
- **Proposed shorter entry:**
  - ★ `[reply]` **After the release: the AI's own instructions write the hidden-block label in the odd shape** — **OPEN, from plan 78.**
  - Five places show the label between two sets of backticks (`ollama_prompts.py` line 483; `strategy_spoiler_policy.py` lines 139, 150, 161, 165), the likely reason a small model copies it.
  - Rewording waits for the maintainer's call (plan 78, question 13) and a before-and-after count of covers.
- **Long notes:** none linked.

## Removing a model on the Deck also drops its name from the saved try order, even when the AI runs on a PC that has the same model

- **Title / place:** same title; Bugs, line 87.
- **Verdict:** true.
- **Proof:** `py_modules/backend/services/ollama_local_setup_rpc.py:409-423`: after "ollama rm" the tag is removed from both saved orders with no check for a PC model of the same name. No commit since changes it (last touch `9a27e08`, a test change). No test covers the PC case. No evidence file.
- **Decision owed?** No decision recorded.
- **Test owed?** Yes, a Deck check with the AI on a PC. No evidence exists.
- **Proposed shorter entry:** keep as is (two lines).
- **Long notes:** none linked.

## After the release: two clean-ups behind the scenes

- **Title / place:** same title; Bugs, line 89.
- **Verdict:** true.
- **Proof:** the unused live-line trimming code is `liveReasoningText` in `src/utils/reasoningDisplay.ts:53`; it is used only by tests (`reasoningDisplay.liveSlice.test.ts`, `reasoningDisplay.test.ts`, `reasoningDisplay.tidy.test.ts`) and by nothing else in `src`. The read-through is `docs/test-evidence/plan78-G-after-answer-readthrough.md` (finding 6 is "POSSIBLE, developer builds only", line 131). Plan 79 line 151 lists the removal for after the release.
- **Decision owed?** No decision recorded.
- **Test owed?** No (tidy-up). Gates cover it.
- **Proposed shorter entry:**
  - ★ `[platform]` **After the release: two clean-ups behind the scenes** — **OPEN, from plan 72.**
  - Remove the old live-line trimming code, now used only by its tests (`liveReasoningText`). Read the step after an answer for stale copies: findings 1 to 5 are fixed (Verify); finding 6 is only possible. Full note: [roadmap-details.md](roadmap-details.md#after-the-release-two-clean-ups-behind-the-scenes).
- **Long notes:** the heading holds one dated note ("2026-09-30 (plan 78 helper G)"). Keep it. Nothing to archive.

## A plugin reload while a game is running can put Steam's Home screen in front of the game

- **Title / place:** same title; Bugs, line 93.
- **Verdict:** true.
- **Proof:** `docs/test-evidence/plan38-M1-deck.json` ("the reload put Steam's Home in front, the game was brought back through the Steam menu's running-game entry"); `docs/test-evidence/t75-feature-F1-REAL-POPUP.json` ("Steam never put a game window in front. The screen stayed on Steam Home for 8+ minutes ... GUIDE opens a main menu whose first entry is Home, not the game, so deck_exitGame refuses"); `docs/test-evidence/plan77-P77-TRAP-LONG.json` ("left the game hidden behind Steam's home screen after the plugin reload ... needed one A on the Resume button"). Also `docs/test-evidence/plan78-CHIP-BUTTON-07.json` (Half-Life 2 never came to the front). Small wording point: the entry says "Steam's menu could not close it"; the evidence says the menu's first entry is Home, not the game, so the exit tool refuses.
- **Decision owed?** No decision recorded.
- **Test owed?** No; evidence exists. It is a developer action (reload), not an everyday route.
- **Proposed shorter entry:**
  - ★ `[platform]` **A plugin reload while a game is running can put Steam's Home screen in front of the game** — **OPEN, found 2026-09-28 (plan 75).**
  - Seen three times. Once the game came back through the Steam menu (`plan38-M1-deck.json`). Once it never showed a window (`t75-feature-F1-REAL-POPUP.json`). Once one A on Resume brought it back (2026-09-29, `plan77-P77-TRAP-LONG.json`).
- **Long notes:** none linked.

## B on the "Clear all plugin data?" box also takes the panel from Settings back to Main

- **Title / place:** same title; Bugs, line 97.
- **Verdict:** true.
- **Proof:** `docs/test-evidence/plan79-P79-SETTINGS-CLEAR-BOXES.json` (build `c98f749e`): "After B the plugin was on Main, not Settings ... Not part of the pass line"; settings file unchanged (0 differing keys). Test row `P79-CLEAR-BOXES-SAFE`, `docs/testing.md` line 310: "Done — passed (Deck) 2026-10-02; one side finding filed". No commit since touches this.
- **Decision owed?** No decision recorded.
- **Test owed?** The evidence exists. A re-check is owed once a fix lands.
- **Proposed shorter entry:**
  - ★ `[ui]` **B on the "Clear all plugin data?" box also takes the panel from Settings back to Main** — **OPEN, seen on the Deck 2026-10-02 (plan 79, build `c98f749e`).**
  - The box closed, nothing was cleared, settings unchanged, but the ring then sat on "Main tab". The Clear cache box and the big-download box did not do this. No fix yet. Evidence `docs/test-evidence/plan79-P79-SETTINGS-CLEAR-BOXES.json`; row P79-CLEAR-BOXES-SAFE.
- **Long notes:** none linked.

## A faded ghost of the tab bar is left drawn over the chip row after touching the screen

- **Title / place:** same title; Bugs, line 99.
- **Verdict:** true.
- **Proof:** `docs/testing-manual.md` line 554, row TAB-BAR-GHOST-01: "regressed — failed by hand 2026-09-23 (build `a224fb6`)" (still open, a finger is needed); `docs/test-evidence/plan76-P76-M-TABBAR-GHOST.json` (D-pad half not reproduced; note at roadmap-details line 2850); plan 77 line 95 sends the touch half to the maintainer's checks page. The recording is not in the repo (the entry says so). TAB-BAR-GHOST-01 appears in `docs/testing-manual.md` only; it has no row in `docs/testing.md`.
- **Decision owed?** No decision recorded.
- **Test owed?** Yes, by hand with a finger: `docs/testing-manual.md` row TAB-BAR-GHOST-01. Evidence for the D-pad half: `docs/test-evidence/plan76-P76-M-TABBAR-GHOST.json`.
- **Proposed shorter entry:**
  - ★★ `[tabs]` **A faded ghost of the tab bar is left drawn over the chip row after touching the screen** — **OPEN, failed by hand 2026-09-23 (build `a224fb6`).**
  - After Show details → Session, both tab bars stayed drawn. The D-pad half did not reproduce (2026-09-28 and 2026-09-29); the touch half needs a finger. Check: row TAB-BAR-GHOST-01 in `testing-manual.md`. Older notes: [details](roadmap-details.md#a-faded-ghost-of-the-tab-bar-is-left-drawn-over-the-chip-row-after-touching-the-screen).
- **Long notes:** the heading holds one dated note (2026-09-28, build `39c17312`). Keep it. The guess about closing a Decky popup rebuilding the plugin, and the recording path, can go to the archive (the guess is stated in the manual row too).

## Focus ring styling is inconsistent between plugin controls and Steam's own

- **Title / place:** same title; Bugs, line 110.
- **Verdict:** unclear. Why: the claim "modal scoping shipped; a blanket rule was tried and reverted" has no commit, test row or evidence that I could find (`git log --grep` for "blanket" and "native outline" found nothing; no row in testing.md). The 2026-10-02 ring walks (`plan79-P79-RING-WALK-TABS.json`) found rings or highlights on every stop, and plan 79 line 148 says the ring looking slightly different from Steam's own is "accepted for 0.6.0" (a plan line, not a locked decision).
- **Proof:** the above; `docs/roadmap-details.md` line 516 "Small and cosmetic, as filed" (older wording, no proof).
- **Decision owed?** Possibly: the "accepted for 0.6.0" is not in the locked file. No decision recorded.
- **Test owed?** No evidence exists for the "inconsistent" claim itself.
- **Proposed shorter entry:**
  - ★★ `[focus]` **Focus ring styling is inconsistent between plugin controls and Steam's own** — **PARTIAL; accepted for 0.6.0 in plan 79's list (not a locked decision).**
  - Modal scoping shipped; a blanket rule was tried and reverted in favour of Steam's native outline (no commit found to name). Weak rings still listed above. [Detail](roadmap-details.md#small-and-cosmetic-as-filed).
- **Long notes:** the "Small and cosmetic, as filed" heading holds other entries too (chip, overlay, grid clipping). Keep all; they are not mine to trim. Only the last bullet belongs to this entry.

## Up from the answer bubble, with Steam's ring on the whole answer, scrolls the whole answer instead of moving the ring

- **Title / place:** same title; Bugs, line 112.
- **Verdict:** true.
- **Proof:** `src/utils/answerBubbleNavigation.ringOnBubble.test.ts:111-118` records it as by design ("Up from the bubble itself never steps into a section ... Each press scrolls the panel up with the ring on the whole bubble until ... leaves"); `affa7fa0` fixed the Down half only. Plan 79 line 533 lists it as found, not fixed. No evidence file. Note for review: the test comment treats the behaviour as intended, so the maintainer may call it not a bug.
- **Decision owed?** Yes, in effect: whether this is wanted. No decision recorded.
- **Test owed?** No evidence exists; seen only in the test setup.
- **Proposed shorter entry:**
  - ★★ `[focus]` **Up from the answer bubble, with Steam's ring on the whole answer, scrolls the whole answer instead of moving the ring** — **OPEN, found 2026-10-02 (plan 79); not a trap, since the press does something.**
  - Not fixed. A test comment calls it by design (Up leaves the bubble after scrolling it back). Seen in the test setup only, not on the Deck. No evidence file.
- **Long notes:** none linked.

## Reloading the plugin while a heavy game is running can leave Steam's interface gone until the Deck is restarted

- **Title / place:** same title; Bugs, line 114.
- **Verdict:** true, with one wording point.
- **Proof:** `docs/test-evidence/plan78-THINKING-SLOW-01.json`: "Steam's debug list showed only SharedJSContext and one empty target from 12:29 to 12:35 (6 minutes or more). The Quick Access page never came back. Free memory about 550 MB of 14.8 GB ... The maintainer then reported Steam frozen and rebooted it by hand". The evidence says "rebooted it" (Steam); the entry says "restarted the Deck". Which one is not clear from the file; the entry's "until the Deck is restarted" should be checked with the maintainer or reworded to "until Steam was restarted". Block 3d: `docs/test-evidence/plan78-CHIP-BUTTON-07.json` (Half-Life 2 never came to the front, about 100 s).
- **Decision owed?** No decision recorded.
- **Test owed?** No; evidence exists. Plain-language rule for the Deck driver is in the entry.
- **Proposed shorter entry:**
  - ★★ `[platform]` **Reloading the plugin while a heavy game is running can leave Steam's interface gone until Steam is restarted** — **OPEN, seen once, 2026-10-01 (plan 78, Deck block 3e).**
  - Black Mesa running, about 550 MB free of 14.8 GB, then no Quick Access page for six minutes or more. A real player never reloads the plugin this way; it is first a rule for the Deck driver. Evidence `docs/test-evidence/plan78-THINKING-SLOW-01.json`. Related: the Home screen entry above.
- **Long notes:** none linked.

## The chat summary card appears behind the dock until Down is pressed

- **Title / place:** same title; Bugs, line 118.
- **Verdict:** true.
- **Proof:** `docs/testing.md` line 236, row F6-SUMUP: "FAILED (Deck) 2026-09-27; accepted as is for 0.6.0 (the maintainer's call, 2026-09-27)"; evidence `docs/test-evidence/plan72-F6-SUMUP.json`, `plan72-F7-SUMUP.json`, `plan72-F8-SUMUP.json` (all exist). Commits `a9fe54bb`, `c603925d`, `01127c79`, `5dbb9bff` exist. Plan 79 line 147 repeats "accepted for 0.6.0".
- **Decision owed?** The maintainer's call is recorded only in plan 72, not in the locked file: [plan 72 section 8](../planning/72-release-bug-session.md#8-known-issues-for-the-060-release-notes-final-2026-09-27). No locked decision heading exists. Link to the decision's own heading: none.
- **Test owed?** Evidence exists (the failures). A re-check is owed only after the after-release hand-off work.
- **Proposed shorter entry:**
  - ★★★ `[layout]` **The chat summary card appears behind the dock until Down is pressed** — **PARTIAL, found 2026-09-25 (plan 68). Accepted as is for 0.6.0 (the maintainer, 2026-09-27).**
  - The card shows itself and one Down reaches it; two more tries to hand over the ring failed on the Deck (`plan72-F7-SUMUP.json`, `plan72-F8-SUMUP.json`): Steam keeps the ring on the greyed "Sum up again". Named in the release notes. After the release: finish the hand-off or take the tries out of the code. Row F6-SUMUP. [Detail](roadmap-details.md#the-chat-summary-card-appears-behind-the-dock-until-down-is-pressed).
- **Long notes:** keep the paragraph "Found 2026-09-25 during plan 68's Deck pass ..." (the goal) and the two 2026-09-27 notes (they carry the failed tries). The numbers (597 against 600; 81 and 44 of 418 pixels) and the "two-line reason line dips 4 px" sentence can go to the archive.

## Some saved answers have a hidden block's markers written twice, cause unknown

- **Title / place:** same title; Bugs, line 125 (the last entry before "## Features").
- **Verdict:** true.
- **Proof:** `docs/test-evidence/plan77-SUMUP-12.json` ("both doubled" shape on the Deck; "removed=3 ... the doubled block counted as one hidden block"; the hidden word appeared 0 times in the log; verdict "PASS (with the note that no summary existed to check)"). The fix `6843f8e1` exists ("Keep a hidden block hidden when its markers are written twice"); `8753cb7f`, `74e8fc7b`, `d2e5e98e` exist. CHANGELOG.md lines 312-313: "why an answer ends up with doubled markers in the first place is still unknown". The cause is unproven, so PARTIAL stands. The entry's "Deck check owed" is partly met: the guards passed (SUMUP-12); the cause was never found. SUMUP-12 has no row in `docs/testing.md` or `testing-manual.md` (searched).
- **Decision owed?** No decision recorded.
- **Test owed?** No for the guards (evidence exists). The cause cannot be tested until one is found.
- **Proposed shorter entry:**
  - ★★★ `[reply]` **Some saved answers have a hidden block's markers written twice, cause unknown** — **PARTIAL, found 2026-09-25 (plan 68).**
  - The chat memory now copes with the doubling (`6843f8e1`) and the guards passed on the Deck 2026-09-30 (`docs/test-evidence/plan77-SUMUP-12.json`). Why it happens has not been found; most likely the model. [Detail](roadmap-details.md#some-saved-answers-have-a-hidden-blocks-markers-written-twice-cause-unknown).
- **Long notes:** keep "Found 2026-09-25 during plan 68's Deck pass ..." and the "Why an answer ends up saved with doubled markers ... is not known" lines. The sentence on the one-line shapes fixed in plan 72 is already in the changelog; it can go to the archive. The "Deck check owed: find or make an answer ..." sentence is now met by SUMUP-12 and can go.

## Notes for the review

- **Unclear (3):** entry 3 (sliver when walking Up: may be changed by plan 79; no re-measure), entry 7 (tooltip: seen once, not seen on the next sweep, no named fix) and entry 16 (focus ring styling: no proof for "modal scoping shipped" or the revert).
- **Decisions that exist only as open questions or plan lines:** entry 9 (plan 78 question 12), entry 10 (plan 78 question 13), entry 16 and entry 19 ("accepted for 0.6.0": plan 72 section 8 and plan 79 line 147-148, not in the locked file). None has a locked heading to link.
- **Wording to check with the maintainer:** entry 18 says the Deck was restarted; the evidence says only "rebooted it" after "Steam frozen". Entry 9: the evidence says the hidden block's own words were readable; the roadmap says no protected name was.
- **Stale numbers in an entry:** entry 10's line numbers for `strategy_spoiler_policy.py` are off by one (138/149/160/164 are now 139/150/161/165), and 271 holds a different shape. Shorter entry above uses the new numbers. The entry says "six places"; the code shows five.
- **Entry 17** may not be a bug: a test comment says the behaviour is by design.
- **TAB-BAR-GHOST-01** and **SUMUP-12** have no row in `docs/testing.md`; the first is in `testing-manual.md` only, the second has an evidence file but no row. Not changed here.
- No entry looked already fixed (call 8). No entry moves to Done or Verify.
