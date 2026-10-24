# Plan 96, Deck block G: handover

Written by the block G driver, 2026-10-18 about 15:42 Deck time (19:42 UTC). Evidence: `C:\Users\still\Documents\bonsAI-workshop\test-evidence\plan96-P96-FINDLAN-try2.json`.

## State the Deck is in

- Build on the Deck: commit 73738058 (code of bf57b0f0), bundle sha256 starts 8bdfff8b7f5e. No deploy by this block. One plugin reload.
- Live screen: the Deck's own screen (panel page 854 x 766).
- Keep-awake: re-taken at the start with 480 minutes, runs out 2026-10-19T03:36:35Z. Settings backup is still `/home/deck/p96-settings-backup.tgz`.
- Test chat "test" (chat 1 of 1) open on the Main tab. No game running. Ask mode left as it was.

## Settings changed and whether they are back

- ollama_local_on_deck: true -> false (plugin toggle) -> true again. settings.json md5 4786b12b8f6f7a215f0e9f8c316d3da8 at start and at end. Nothing else changed.

## Result

- P96-FINDLAN-try2: PASS on all three halves (walk, search, ring return). "..." shows at once; the "none found" line appears at about 9 s.

## Quirks tonight

- After the reload, openPlugin fails once (no bonsAI tab in the rail); closing and reopening Quick Access with the chord, then openPlugin, worked.
- The Ollama tab's sections start folded; open "Where AI runs" to see the toggle, address box, Test connection and Find LAN. With "Run AI on this Deck" on, the address box and Find LAN are not shown.
- UP from Find LAN skipped the address box and the Save row and landed on the second toggle (same instability as the block F note).
- The Find LAN box draws on the Steam Big Picture page; read it with target "Steam Big Picture Mode".
- Deck clock read 19:36 UTC at the start, earlier than the 19:50 deploy time in the task.
