# Plan 97, Deck block G (the freeze's third try): handover

Written by the block G driver, 2026-10-22 about 11:20 Deck time. Evidence: `C:\Users\still\Documents\bonsAI-workshop\test-evidence\` (`plan97-P97-G-DEPLOY.json`, `plan97-P97-L14-FREEZE-try3.json` and `-end.png`, `plan97-P97-L14-SECTIONS-try2.json`, `plan97-P97-L4-ANSWER-DIPS-try3.json`, `plan97-P97-G2-launch-run.json`). Read `97-handover-F.md` too.

## State the Deck is in

- Build on the Deck: tip f124022f, bundle md5 315fbc7343b481e233c1d3a6b53dc6f6 (was fc3e8a2c041b31ba19c08af165750945). Equal to the PC build. The deploy rebuilt the bundle at 11:03.
- Screen: the monitor is live (Quick Access page 855 wide, 766 tall with no game).
- Keep-awake: taken 11:02 EDT, 480 minutes, `expiresAt` 2026-10-22T23:02:44Z.
- Quick Access open on the Main tab, test chat "test" (chat 1 of 1), mode chip Strategy, ring on Ask. No game (Deep Rock Galactic: Survivor exited; no process left, checked over SSH).
- Settings file md5 4786b12b8f6f7a215f0e9f8c316d3da8, same as before the block. Nothing in it was changed. Text size Small, Run AI on this Deck ON, scramble on: untouched.
- The Deck's AI (gemma4:e2b-it-qat) is loaded again, because the control walk needed one new question. The test chat gained one question: "In Hades what does the dash do against enemy attacks".
- Browser storage and the PC address box: not touched.

## Rows

- P97-G-DEPLOY: PASS.
- P97-L4-ANSWER-DIPS-try3 (G1): COULD NOT RUN. Skipped on the owner's instruction, the fix is still being built. A short file says so.
- P97-L14-FREEZE-try3: UNCLEAR. The lost-focus state (hasFocus false) was not reached in six tries with the game up (five by the paperclip route, one by Delete chat then B). hasFocus read true every time. Twice the page came back with the page root as active element and the ring on Show details, still with hasFocus true. Control walk, hasFocus true, PASS (see below).
- P97-L14-SECTIONS-try2: UNCLEAR for the gated half (state not reached). Control PASS.

## The full Up walk (hasFocus true, ring moved on every press)

Game up, old Sifu answer, no chip row: Show details (link, y 702, 26 tall) -> Show details (divider row, 13 tall) -> Helpful -> answer sections 5, 4, 3, 2, 1 (bottom to top) -> Show reasoning -> question row -> 99 earlier -> chat name -> bonsAI tab. 13 Ups, 13 moves. The same walk with no game gave the same 13 landings.

No game, new Hades answer with chips and a notes block: box -> chip "How do I fix stuttering?" -> Boss note (spoiler) block -> Show details (divider only) -> Helpful -> "B. General run strategy and progression" -> "A. Focusing on a specific boss fight" -> answer -> Show reasoning -> question row -> 99 earlier -> chat name. 10 Ups, 10 moves. Down back all the way to Ask: 12 presses, 12 moves, no stop visited twice (Down from the notes block landed on the chip "What's ahead (without spoilers)?").

Also with hasFocus true and no game: Left from the box lands on the paperclip 3 of 3, Right from the box lands on the mode button 3 of 3; Left and Right on chips move one chip each (3 of 3 each); Down on a section line lands inside on Ollama (Where AI runs), Settings (Data line, 3 of 3) and Developer (Knowledge base). Log lines `dpad.lostFocusHop`: 0, as expected without lost focus.

## Settings changed

None. Every section I opened (Where AI runs, Data, Knowledge base) was closed again.

## Odd things for the next driver

- The paperclip route did not give lost focus in six tries today (it did on the first try in block E). Both sightings of a half state (active element the page root, ring on Show details) came right after the chord reopen. Maybe the game needs to be up longer than about 4 minutes, or Steam's own focus differs: the next driver could try after 7 minutes of game time, as in block E.
- `deck_pressChord` GUIDE+A closed Quick Access, and the first `deck_openPlugin` after the launch said "already open" while the page read visible with hasFocus true: so the menu was in fact open.
- "Show details" appears as two stops on an answer that has the details link (link, then its divider row); with chips and a notes block only the divider row showed.
- The box is not on the paperclip row. From the paperclip, Right goes to the mode button, so Left/Right repeats from the box need an Up in between.
- `deck_launchGame` and `deck_exitGame` write their run files into the repo's `runs` folder, `deck_captureScreenshot` into the repo's `screenshots` folder (tool defaults). I copied the launch file and the end screenshot into the evidence folder; both repo copies are still there (ignored by git or untracked, I did not touch git).
- B presses log "voice: stop pressed, no recording was running" lines. Harmless.
- Available memory with the game and no AI loaded: about 8.2 GB; with the AI loaded, after the game, 4.7 GB.
