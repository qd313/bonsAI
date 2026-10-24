# Plan 97, Deck block H (the last): handover

Written by the block H driver, 2026-10-22 about 11:52 Deck time. Evidence is in `C:\Users\still\Documents\bonsAI-workshop\test-evidence\`: `plan97-P97-H-DEPLOY.json`, `plan97-P97-L4-ANSWER-DIPS-try3b.json`, `plan97-P97-L14-FREEZE-try4.json` (with `-down-dead.png`, `-hops-raw.txt`, `-walk-raw.txt`), `plan97-P97-L14-SECTIONS-try3.json`, and the game launch and exit runs (`plan97-P97-H-launch-run.json`, `plan97-P97-H-exit-run.json`). Read `97-handover-G.md` too.

## State the Deck is in

- Build on the Deck: tip acbaeb72, bundle md5 409a963a92087cad8c79b286cb4b77aa (was 315fbc73...). Equal to the PC build.
- Screen: the monitor is live (Quick Access page 855 wide, 766 tall with no game).
- Keep-awake: taken 11:19 EDT, 480 minutes, `expiresAt` 2026-10-22T23:19:22Z.
- Quick Access open on the Main tab, test chat "test" (chat 1 of 1), mode chip Strategy, ring on Ask. No game: Deep Rock Galactic: Survivor was exited, no process left (checked over SSH).
- Settings file md5 4786b12b8f6f7a215f0e9f8c316d3da8, the same as before the block. Text size Small, Run AI on this Deck ON, scramble ON.
- The Deck's AI (gemma4:e2b-it-qat) is NOT loaded now (I unloaded it for the game and did not load it again on purpose). Asking the next question loads it.
- The test chat gained four long questions: Hollow Knight, Celeste, Hades, Dead Cells.

## Rows

- P97-H-DEPLOY: PASS.
- P97-L4-ANSWER-DIPS-try3b: PASS. Four long Strategy answers (three ended with the A/B/C choice menu, the case that used to flash the box). The answer never rose above its final height, the biggest fall was 1.6 px (scramble off), the text never held "Code block incoming". Frame rate in the last 3 s: 58 to 60. One answer (Celeste) grew by one step of 48.1 px 1.4 s before the end and did not fall back; it ended in spoiler covers, not a code box.
- P97-L14-FREEZE-try4: reached the lost-focus state on try 7 of 8 (paperclip route, game up 11 minutes 17 seconds; tries 1 to 6 read hasFocus true). Verdicts in the file: UNCLEAR for how often it happens, FAIL for the Up/Down walk, PASS for Left/Right from the box, COULD NOT RUN for chips (no chip row without a question asked with the game up).
- P97-L14-SECTIONS-try3: PASS, 3 of 3 on the Ollama, Settings (Data) and Developer tabs with hasFocus false.

## The new finding (needs the owner)

With hasFocus false and the Dead Cells answer (three sections, then the A/B/C menu): Down from the LAST answer section onto "A. ..." does not move the drawn ring. The page's own active element moves to the A button, the ring stays on the section. 10 of 10 presses dead. The plugin log has no `dpad.lostFocusHop` line for them. Escape routes: Right (to Copy), then Down, goes Helpful, Show details, box, Ask. Up from Helpful reaches C, B, A and the sections. The same walk with hasFocus true (game closed) moved on every press including that one. Also, in the first walk the first three Ups from the question box did not move the ring (a second Up from the box a few minutes later moved at once).

## Settings and side effects

No setting changed in the end. The scramble animation was switched off for one answer on the Developer tab (checkbox) and back on; the file read true, false, true. By mistake a walk tool stopped on "Open all sections" and I pressed A on it without reading focus first: every Developer section opened, I closed them again with "Close all sections". Three paperclip tries added three pictures to the Steam screenshot folder. Three "Delete chat?" dialogs were opened and cancelled with B; the chat is intact.

## Odd things for the next driver

- `deck_walkTo` that does not find its text can leave focus on a different button than you expect (it stopped on "Open all sections" at the bottom of the Developer tab). Read focus before every A.
- The lost-focus state showed up on the 7th try, after the game had been up 11 minutes. The first six tries (game up 7 to 10 minutes) all read true.
- When hasFocus is false the "Delete chat?" dialog reads hasFocus false while open and true again 1 s after B.
- `deck_launchGame` and `deck_exitGame` were run with `writeEvidence` false so nothing was written into the repo. Screenshots from `deck_captureScreenshot` land in the rig folder in the scratch area.
