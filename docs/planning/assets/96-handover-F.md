# Plan 96, Deck block F: handover

Written by the block F driver, 2026-10-18 about 15:25 Deck time (19:25 UTC). Evidence is in `C:\Users\still\Documents\bonsAI-workshop\test-evidence\` as `plan96-<ROW>.json` (rows: P96-F24-SPINNER, P96-F22-CHIP-TWICE, P96-FINDLAN, P96-CANCEL-RIGHT, QA-LOOK4-main, P96-F-FREEPLAY).

## State the Deck is in

- Build on the Deck: commit 24f5c300, bundle sha256 starts 274fc0198492. No deploy by this block.
- Live screen: the Deck's own screen (panel page 855 x 766 with no game, 855 x 845 with a game).
- Keep-awake: taken at the start with 480 minutes, runs out 2026-10-19T02:57:45Z (22:57 Deck time on the 18th).
- Settings backups: `/home/deck/p96-F-settings.json.bak` (the file as I found it, md5 4786b12b8f6f7a215f0e9f8c316d3da8), `/home/deck/p96-F-findlan-current.json` (the file as it was in the middle of the FINDLAN row), `/home/deck/p96-settings-backup.tgz` (block M).
- Test chat: named "test" (chat 1 of 1, 62 earlier). The maintainer had renamed or replaced the Hollow Knight chat; I used "test". It is open on Main.
- Plugin open on the Main tab, ring on the tab strip / chat bar. No game running (checked with pgrep). Ask mode on Strategy (the maintainer's own pick, left alone). The Deck's own AI is loaded in memory.

## Settings changed and whether they are back

| Item | Was | Now |
|---|---|---|
| settings.json as a whole | - | moved aside once (FINDLAN popup run), copied back; md5 4786b12b8f6f7a215f0e9f8c316d3da8 before and after the final reload and at the end of the block |
| preset_single_chip | false | false (on for F22, back off, read from the file) |
| show_developer_tab | true | true (off for FINDLAN, back on by the file restore) |
| ollama_local_on_deck | true | true (off for FINDLAN, back on by the file restore) |
| ollama_local_autostart | true | true |
| capabilities.internet_downloads | true | true (off for the CANCEL row, back on, read from the file) |
| PC address (page storage bonsai:pc-ip) | 192.168.86.27:11434 | 192.168.86.27:11434 (the first-run run cleared it, I wrote it back through the page, read back) |
| Page flags cleared by the first-run run | help chip dismissed, thinking notice, note offers, etc. | NOT put back. Help chip "How to use bonsAI" shows on Main. Beta Notice was accepted again ("Got it") and the first-run popup "Not now". Page keys left: disclaimer-accepted, pull-model-new-badge-v1, last-tab-at, tab-resume-mode, active-chat-slot, first-run-where-ai-runs-seen-v1, last-tab. |

## Results in one line each

- F24 spinner with a game (P96-F24-SPINNER): spinner animation bonsai-thinking-spin, running, angle different at every 0.5 s sample (68 samples); no glow ran, only the question box caret blinked after the answer finished; page frame rate median 60 fps (plan 94: 39), lowest slice 44. The two screenshots are about 2 s apart, not 0.5 s (UNCLEAR on that half). Game exited and process gone.
- F22 chips (P96-F22-CHIP-TWICE): PASS. Overflowing chips scroll, stand 0.9 to 1.0 s, jump back in 0.4 to 0.5 s, scroll again, stand 0.9 to 1.0 s, then change. A fitting chip stayed 10.7 s without scrolling. One-chip mode: all seven chips fit, so no scroll read, dwell 7.0 to 7.7 s (UNCLEAR). Setting back OFF.
- Find LAN (P96-FINDLAN): UNCLEAR twice. On the Ollama tab it sits beside Test connection under the address field, not beside the field. A opens a Search / Cancel box first; after Search nothing showed (no "...", no list, no "none found") on three runs. PASS in the first-run popup: Find LAN is on the address field's own row.
- Cancel boxes (P96-CANCEL-RIGHT): PASS for Clear cache, Clear all data, Delete chat, Turn on internet downloads, Remove knowledge base and the first-run foot. UNCLEAR for the AI models tick (no box; Queue 1 - 3.1 GB, B closes the screen, nothing pulled). Nothing cleared, deleted or removed.
- QA-LOOK-01 Main (QA-LOOK4-main): PASS, findings list empty. The "AI is not set up" variant COULD NOT RUN (needs typing a bad address).
- Free play on Main (P96-F-FREEPLAY): two walks, 0 stops not visible, no dead press. Saved as `C:\Users\still\Documents\bonsAI-workshop\checks\P96-F-FREEPLAY-main.json`.

## Quirks tonight

- After a plugin reload the Quick Access rail has no bonsAI tab until the menu is closed and opened with the chord. openPlugin fails once, then chord, then openPlugin.
- Find LAN, Delete chat and the other boxes draw on the Steam window, not in the panel: while a box is up the panel page is empty (no .bonsai-scope). Read the box from the "Steam Big Picture Mode" page target. After Search the whole panel is rebuilt.
- On the Ollama tab the D-pad route to Test connection / Find LAN is not stable: DOWN from the address field skips both; UP from Knowledge base reaches Test connection, then RIGHT reaches Find LAN. Once DOWN from "Save current PC address" skipped the address field too.
- Settings > Data: "Clear all data..." sits to the right of "Clear cache...", not below it; DOWN from Clear cache goes to Open all.
- On the AI models screen, the Cancel box does not exist on the tick; there is a Cancel and a Done at the foot.
- deck_walkTo, deck_runSequence and openPlugin return very large results; use pressButton plus a short readPage when only a name is needed.
- Screenshots taken with the rig add files to Steam's screenshot folder.

## Not done / owed

- The 'AI is not set up' look check (no cheap way without typing in the address box).
- Whether Find LAN really searches: the three Search presses showed nothing; the owner should say if the runbook is stale or the result display is a bug.
- A side-by-side picture of the Beta Notice and a cancel box (only the shared button classes were compared).
- Page flags (help chip, thinking notice, note offers) are not restored.
- Repo `runs/` and `screenshots/` hold the rig's own files (launch, exit and sweep reports, DeckCapture images); not touched.
