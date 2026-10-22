# Plan 97, Deck block E (the rest of the per-fix checks): handover

Written by the block E driver, 2026-10-22 about 10:25 Deck time. Evidence folder: `C:\Users\still\Documents\bonsAI-workshop\test-evidence\` (files `plan97-<ROW>.json`, pictures and recordings beside them). Read `97-handover-B.md`, `-C.md` and `-D.md` too.

## State the Deck is in

- Build on the Deck: commit 15565346, bundle f28c5fc4676d. No deploy in this block.
- Screen: the monitor is live. Quick Access page 855 x 766.
- Keep-awake: taken 09:40 EDT, 480 minutes, `expiresAt` 2026-10-22T21:40:26Z. Still held.
- Plugin open on the Main tab, Quick Access open, test chat "test" (still chat 1 of 1). Mode chip Strategy. No game running (Deep Rock Galactic: Survivor exited 10:19:46; no process left, checked over SSH).
- The plugin was reloaded twice in this block (10:02 for the help chip, about 10:20 after the game), never with a game up.
- Ollama: the Deck's AI model was unloaded for the game; it loads again on the next question. Run AI on this Deck untouched (still ON).
- Settings file md5 4786b12b8f6f7a215f0e9f8c316d3da8, same as the end of block D.
- Test chat gained these questions: What is on this screen (three times, no picture reached the AI), two Hollow Knight/Celeste list questions, the Deep Rock long answer, the Hades answer, kiting/overclock, Hades dying to bosses, the Hollow Knight boss guide. A stale "next question draft" was cleared with Clear.
- The Steam screenshot folder gained one picture from the paperclip's "Close menu & take screenshot" at about 10:15.

## Settings changed and whether they are back

- Scramble animation (Developer > Animations): true, false, true. Back (file read true).
- Page storage `bonsai:plugin-help-dismissed`: was "1", removed, set back to "1". Back.
- Mode chip: Strategy all through (the runbook said end on Speed; this Deck's normal is Strategy, as you told me).
- Nothing else.

## Rows, one line each

- P97-L1-PICTURE-ANSWER: FAIL. The plugin's picture shrinker (ffmpeg inside the plugin) fails on all three pictures (410 KB, 251 KB, 39 KB): "libstdc++ GLIBCXX_3.4.32 not found". The picture is dropped (attachments=0), the answer says no screenshot was attached, and the reply notes the picture is too big to send. ffmpeg itself works from a plain ssh shell. 1280x800 half COULD NOT RUN (not in the picker's list).
- P97-L3-SPOILER-BOLD: UNCLEAR. Two answers, no stray stars, bold headings drawn; neither had a hidden block inside a bold line.
- P97-L4-ANSWER-DIPS: FAIL with scramble on (drops of 35.1 and 13.5 px about 3 s before the end), PASS with scramble off (no drop).
- P97-L5-GLOSSARY-NAMED: PASS. Kiting and Overclocks underlined; box opens; Hades answer has none.
- P97-L11-PC-PACE: COULD NOT RUN. No PC address is saved in the plugin's settings (the PC does answer at 192.168.86.38).
- P97-E-DECKY-BUTTON: MEASURED. Left from Clear lands on Stop generation while streaming and on Voice input when idle (the control directly to its left; same as Steam's own neighbour).
- P97-HR-HELP-CHIP-RING: PASS. Focused chip has the blue 0.2 layer, green border kept; unfocused is the plain green bar.
- P97-G1-TAB-GLIDE: landing PASS (40 presses, none lost), frame rate PASS (55.5 to 60 without a game; 48.5 with one), line glides with a game PASS; flash UNCLEAR (recordings show a frozen picture); page slide with game UNCLEAR; reduced motion COULD NOT RUN.
- P97-L15-GHOST: PASS. Row hidden at every read, no second strip, log lines for steamRowShown: 0.
- P97-L14-FREEZE: PASS for the gated Down presses (lost-focus state reached on the first try; 10 of 10 Downs, Left/Right moved, hops logged); the Show reasoning step COULD NOT RUN because of a new finding (below). P97-L14-SECTIONS: PASS (3 of 3 with hasFocus false).

## New finding for the owner

With a game running and hasFocus false, Up from the question box moves the ring to the follow-up chip row and then Up, Left and Right stop moving the visible ring (the page's active element still moves between the chip and the knowledge block). The question row and Show reasoning could not be reached. Without a game there is no chip row, so I could not tell if it is the lost focus or the chips. Evidence: `plan97-P97-L14-FREEZE.json` and `plan97-P97-L14-FREEZE-up-dead.png`.

## Odd things for the next driver

- `deck_pressButton` with an array of buttons sends ONE press with all buttons together, not a sequence. Ten fast presses had to be ten calls (about 450 ms apart).
- `deck_walkTo` with "Delete chat" or "bonsAI tab" needs the exact label and the right direction (the tab bar is above, the Delete chat button is to the right of the chat name row).
- Recordings of the panel showed one frozen frame while tabs switched (recording 3 failed with plugin_ui=no).
- The Ask strip's Clear button only exists when the box has text; while streaming the box is empty, so I filled it with the send script.
- Paperclip menu: A opens it with the ring on "Close menu & take screenshot"; "Attach recent screenshot" is one Down below. The picker lists only the newest 24 pictures in two columns.
- Three screenshots were taken by the rig into the repo's `screenshots` folder (the tool's own default); copies are in the evidence folder.
