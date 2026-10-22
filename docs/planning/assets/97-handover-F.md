# Plan 97, Deck block F (second tries): handover

Written by the block F driver, 2026-10-22 about 10:48 Deck time. Evidence: `C:\Users\still\Documents\bonsAI-workshop\test-evidence\` (`plan97-<ROW>-try2.*`, `plan97-P97-F-DEPLOY.json`). Read `97-handover-E.md` too.

## State the Deck is in

- Build on the Deck: commit f1bdab85 (includes ba0d66bd and 6b9ee322), bundle e3fe246f0440 (was f28c5fc4676d).
- Screen: the monitor is live (Quick Access page 855 wide). Quick Access is open on the Main tab, test chat "test" (chat 1 of 1), mode chip Strategy. No game.
- Keep-awake: taken 10:23 EDT, 480 minutes, `expiresAt` 2026-10-22T22:23:13Z. Still held.
- Run AI on this Deck is ON again. Settings file md5 4786b12b8f6f7a215f0e9f8c316d3da8, same as the end of block E.
- Scramble animation: never touched (true).
- Test chat gained: three "What is on this screen" with a picture, two long scramble questions (Deep Rock, Hades) and four more long ones asked while the AI ran on the PC (Deep Rock loadout, Hades guide, Celeste, Hollow Knight, Sifu).
- Browser storage key `bonsai:pc-ip` is back to `192.168.86.27:11434` (see F3).

## Rows

- P97-F-DEPLOY: PASS (f28c5fc4676d to e3fe246f0440, matches the PC).
- P97-L1-PICTURE-ANSWER-try2: UNCLEAR. The shrink error is gone and the picture reaches the AI every time (attachments=1). 251 KB: PASS (30.4 s, payload 59 KB). 39 KB: PASS (24.8 s, 21 KB). 410 KB: right answer but 63.2 s (19 s of it a cold summary step) and payload 84 KB, a little over the 60 s and 70 KB lines. No 1280x800 picture could be picked. No device-lost lines.
- P97-L4-ANSWER-DIPS-try2: FAIL. Scramble ON: both answers still rise about 48.6 px above the final height 2 to 3 s before the end and fall back in steps (35 + 13.5 px; 21.6 + 13.5 + 13.5 px). The new code is in the bundle on the Deck (checked). Frame rate in the last 3 s: 57.7 and 58 (60 in the last second).
- P97-L11-PC-PACE-try2: PASS. PC pace mean 57.1 fps against Deck pace 56.1 over 13 whole windows. Recording saved.

## Settings changed and whether they are back

- Run AI on this Deck: ON, off for F3, back ON (file read true).
- PC address box: was `192.168.86.27:11434`; set to 192.168.86.38 for the test; set back and read back. The saved copy (browser storage `bonsai:pc-ip`) did not follow my second change, so I wrote it directly to `192.168.86.27:11434`.
- Nothing else.

## Odd things for the next driver

- While `deck_record` runs, every other rig call waits, including a button press (one press waited 46 s). A recording that has to show a press must start the action from the page (I clicked Ask with a page timer) or be longer than the wait.
- A PC answer (gemma4:e2b-it-qat on 192.168.86.38) finishes in 7 to 12 s, so a pace test with 2.5 s windows gets only 2 to 3 whole windows per answer. Use more answers, not longer ones.
- First answer after a quiet spell spends about 19 s on a chat-summary step before the picture call.
- The Deck's address box only saves while the Deck's own AI is off. Putting the box back while the switch is on does not save.
- Overlay from the Deck's performance display shows on screenshots (GAMESCOPE line); ignore.
