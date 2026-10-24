# Plan 97, Deck block B (with a game): handover

Written by the block B driver, 2026-10-22 about 08:25 Deck time (12:25 UTC). Evidence folder: `C:\Users\still\Documents\bonsAI-workshop\test-evidence\` (files named `plan97-<ROW>.json`, pictures beside them).

## State the Deck is in

- Build on the Deck: commit 73738058 (code of bf57b0f0), bundle sha256 starts 8bdfff8b7f5e. No deploy.
- Live screen: the MONITOR (Big Picture page 1500 x 844 css at 1.28 scale = 1920 x 1080). The panel page read 855 wide; its height read 766 early and 845 later.
- Keep-awake: renewed 07:45 EDT with 480 minutes. `expiresAt` 2026-10-22T19:45:15Z. Still held.
- Settings backup: block A's `/home/deck/p97-settings-backup.tgz` stands (no rig snapshot taken).
- Ollama: no model loaded (api/ps empty). Models unchanged: gemma4:e2b-it-qat and nomic-embed-text.
- No game running (process confirmed gone over SSH at 08:23:48). Steam is on Home, ring on the first Recent Games tile.
- Plugin and Quick Access are closed. Last plugin reload 08:09 (no game). The passive ghost watcher was injected after that reload and is still sampling in the Quick Access page until the next reload (it only writes to a page variable).
- Test chat "test" is still chat 1 of 1 (nothing deleted). It now ends with five more questions and answers from tonight: weapon upgrade (Speed), Zorblax, Grimthak, Soul Master (Strategy), plus the two asked earlier by block A.

## Settings changed and whether they are back

- Page storage key `bonsai:plugin-help-dismissed`: was "1"; removed 07:45, plugin reloaded, help chip showed; it dismisses itself when opened; set back to "1" at 08:23. Back.
- Ask mode chip: was **Strategy** at the start of block B. Left on **Speed** (the runbook says to end on Speed). The settings file md5 is now 5efbc54ad7a47b265ba8c2fa6d540535 (block A ended at 4786b12b...); the difference is expected from the mode and the questions. If Strategy was the maintainer's normal, set it back.
- Settings tab, Data section: I opened it (A) in all three freeze tries and it was left open in the last one. No value changed. A stray Left in try 1 only moved the ring out of the panel.
- Text size is still Small. Run AI on this Deck untouched.

## The three freeze tries, one line each

- FREEZE-1: MOVED on every Down (three plain, both control triggers). Stuck state not seen. Game up about 1 minute.
- FREEZE-2: STUCK reproduced (first dead Down 07:56:01, game up about 2 minutes) after trigger (b), the paperclip "Close menu & take screenshot" and the chord reopen: the Quick Access page came back with hasFocus false and no ring; then Down from the question box was dead (active element the Ask button, ring stays on the box). Left, Right, LB/RB, three menu close/reopens and a reopen from the Decky list did NOT clear it; only a plugin reload with no game running did.
- FREEZE-3: MOVED on every Down, both triggers; hasFocus stayed true. Stuck state not seen. Game up about 2.5 minutes.
- Extra: P97-B-AFTER-POPUP-FOCUS: the same stuck state (hasFocus false, ring lags the DOM focus, Down from the question box dead) appeared a second time, after Steam's "Delete chat?" box and B, game up about 6 minutes. A menu cycle and Steam's main menu did not clear it. I reloaded the plugin (after exiting the game) and it was clean.

## The ghost reads' first lines (P97-B-GHOST-1, -2, -3)

All nine timed reads and the three post-press reads say "leafFound true, rootFound true", row display none, rule matches, two badge images. Watcher: never a display other than none while the row existed. Ghost strip never on screen (1 s screenshots for rounds 2 and 3; round 1's 1 s screenshot failed to save in my script, its reads are fine). Routes: round 1 the help chip (A opens Steam's help box, button "Got it"); the chip is gone after that one open (it dismisses itself), so rounds 2 and 3 used the Delete chat button -> "Delete chat?" (focus on Cancel) -> B. Cancel/Delete was never pressed. The chats menu (name row) is an in-panel list, not a box, so it was an extra round only.

## Other rows

- P97-B-HELP-CHIP-RING: MEASURED. The chip holds focus but nothing on it changes: no outline, no shadow change; no ring visible. Chip box [48, 662, 300, 26] (screen 855 wide).
- P97-B-TIP-CHIP: PASS (Tip badge showed first try; the badge is green, aria-label "Tip"; Down from Copy landed on Helpful, 100.0 percent visible).
- NOTES-BLOCK-04: FAIL (Zorblax: line shown, no block; Grimthak: no line, a "Glyphid Dreadnought" block drawn).
- NOTES-BLOCK-LADDER: UNCLEAR (the "Soul Master" block opens to a paragraph only; no ladder; Left/Right do nothing).
- SCR-10: COULD NOT RUN (the game asked for a save slot; stopped).
- Evidence files from this block: plan97-P97-B-HELP-CHIP-RING, P97-B-FREEZE-1, -2, -3, P97-B-AFTER-POPUP-FOCUS, P97-B-GHOST-1, -2, -3, P97-B-TIP-CHIP, NOTES-BLOCK-04, NOTES-BLOCK-LADDER, SCR-10 (pictures beside them).

## Odd things for the next driver

- The first deck_openPlugin after the launch said "already open" or opened first time every round tonight (the rig now handles the reopen itself).
- After a reload, Steam can pop a friend-message toast on the game's title screen (07:53).
- walkTo matches by words: "Show Developer tab" matched when I asked for "tab", and a Left on a switch row leaves the panel. Ask for the exact name ("Settings tab").
- The paperclip's "Close menu & take screenshot" and the Steam boxes (help, Delete chat?) hide the Quick Access page; right after they close, read hasFocus before pressing anything. In this block hasFocus false came after trigger (b) once and after the delete box once.
- The runbook said the Tip dot is amber; it is the green accent.
- The chip row rotates; chips decode with a scramble effect for about 2 s after an answer.
- I used scp once by mistake to put a small helper on the Deck (`/tmp/lastans.py`, harmless, in /tmp). Every other Deck command was `ssh deck@192.168.86.52 '...'`.
