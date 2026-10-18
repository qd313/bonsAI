# Plan 96, Deck block E: handover

Written by the block E driver, 2026-10-18 about 01:55 (Deck clock). Evidence is in `C:\Users\still\Documents\bonsAI-workshop\test-evidence\` as `plan96-<ROW>.json` (second-round rows end in `-try2`).

## State the Deck is in

- Build on the Deck: commit f7413dbc (code of 331d4b56), bundle sha256 starts 925a0a8530d3. No deploy by this block.
- Live screen: the Deck's own screen (panel 300 wide; the window is 855 x 766 with no game, 855 x 845 with a game).
- Keep-awake: renewed at the start with 480 minutes, runs out 2026-10-18T13:25:44Z (09:25 Deck time).
- Settings backups: `/home/deck/p96-settings-backup.tgz` (block M), `/home/deck/p96-settings.json.bak` and `/home/deck/p96-E-settings.json.bak` (same content as the live file, md5 5efbc54ad7a47b265ba8c2fa6d540535).
- Test chat: "Which charm should a beginner get first in Hollow Knight", chat 1 of 1, about 118 turns now. It is open.
- Plugin open on the Main tab. No game running (checked: no process). Mode chip on Speed. The Deck's own AI (gemma4:e2b-it-qat) is loaded in memory now.

## Settings changed and whether they are back

| Item | Was | Now |
|---|---|---|
| settings.json as a whole | - | removed twice (E1 first runs), copied back each time; md5 equal to the backup at the end, and a key-by-key diff reads SAME |
| microphone_access | true | true (off for F11, back on, read from the file) |
| ollama_local_on_deck | true | true (off for F1, back on, read from the file) |
| ollama_local_autostart | true | true (it flips with the switch; read true at the end) |
| ask_mode | speed | speed (Strategy for F4, put back through the chip, read from the file) |
| PC address (page storage `bonsai:pc-ip`) | 192.168.86.27:11434 | 192.168.86.27:11434 (each first run cleared it; I set it back through the page, then once through the box; read back) |
| Page flags cleared by the two first runs | help chip dismissed, thinking notice accepted, note offers, pull badge, download sites | NOT put back. The help chip ("How to use bonsAI") shows on Main now. The Thinking notice will show again on the next Off-to-Brief pick. The old "Local runtime (beta)" notice flag also read empty and the notice did not show. |

## Results in one line each

- E1 first-run popup (P96-N1-FIRST-RUN-POPUP): PASS, steps 1 to 7 and 5b. Notes: the "Start the AI with the Deck" switch is OFF in a fresh first run; the popup's status line reads "Installed (2 models)"; after a failed download try the left foot button reads "Close" instead of "Not now"; after "Not now" the ring is on the question box; the Permissions flip in 5b was skipped because a fresh file already has Internet downloads off.
- F11 hint ring (try2): PASS. Down holds, Right reaches Dismiss, Up goes to the box, Dismiss hands the ring to the box.
- F1 no AI (try2): PASS. "Open the Ollama tab" exists and A lands on the Ollama tab; one stop (Show details) sits between the Copy icon and the new button.
- F6 explain (try2): the hint line, the "Explain: kiting (Deep Rock Galactic: Survivor)" row, the box closing and B with the ring on the word all PASS. FAIL on "no reload needed": one plugin reload was needed first (see quirks). UNCLEAR: ring unowned after the second A.
- F4 tick (try2): PASS game half and no-game half (steps reachable, role checkbox, tick survives close and reopen, file holds it, Up from Helpful lands on the last step).
- QA-LOOK3 Main: PASS for the Ask pill (no text-does-not-fit); FAIL for one finding left: the new "Open the Ollama tab" button reads as a light button.
- F14 sum up (try2): PASS. In a new empty chat "Sum up this chat" is greyed and A shows the toast "Available once the chat is longer than the AI's ...".
- E3 free play on Main: no dead press, nothing behind the dock; chat-name row 83 percent visible (FAIL on that stop, same as block D).

## Quirks tonight

- With a game running and the help chip showing, Down from the question box did nothing at all (the ring stayed on the box while the page's active element was the Ask button, document.hasFocus false). It happened with text in the box and with it empty, and the QAM chord (close and reopen, three times), deck_openPlugin, LB/RB, Left/Right did not clear it. One plugin reload (game up about 5 minutes, 9 GB available) cleared it. After the reload, hasFocus read true and Down reached Ask. A plain tab-switch is not enough.
- After a plugin reload the Quick Access rail has no bonsAI tab until the menu is closed and opened with the chord. Every reload needed: openPlugin (fails), chord, openPlugin.
- deck_exitGame cannot open Steam's menu on this Deck; it closes the game with Steam's own close call and says so. Check the process with `pgrep -fa "[D]RG Survivor"` (the bracket stops pgrep from matching itself over SSH).
- Going Up from the question box does not pass through the checklist steps when the ring starts unowned; going Down from the tab bar visits every step.
- The glossary words in an answer vary: the second Explain answer had "Kiting" and "kiting" but no "overclock".
- Screenshots taken with the rig add files to Steam's screenshot folder and show a toast.
- Tool outputs for focus reads are very large; prefer runSequence or a short readPage when only a name is needed.

## Not done / owed

- F6 "overclock then B" was done with "Kiting" (no overclock word in the second answer).
- The Permissions-flip part of 5b (turn Internet downloads off, then first run) was folded into the fresh file's own default.
- Words-struck look for a ticked step was read from the page, not from a picture.
- Cleanup left for the session: the page flags listed above, the model loaded in memory, and the repo `runs/` and `screenshots/` folders hold the rig's own files (launch-game and exit-game reports and DeckCapture images); I did not touch them.
