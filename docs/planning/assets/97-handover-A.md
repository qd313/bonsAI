# Plan 97, Deck block A: handover

Written by the block A driver, 2026-10-22 about 01:01 Deck time (05:01 UTC). Evidence folder: `C:\Users\still\Documents\bonsAI-workshop\test-evidence\` (files named `plan97-<ROW>.json`, pictures beside them).

## State the Deck is in

- Build on the Deck: commit 73738058 (code of bf57b0f0), bundle sha256 starts 8bdfff8b7f5e (dist/index.js dated 2026-10-18 15:35). Plugin version on the About tab: 0.5.0. No deploy.
- Live screen tonight: the MONITOR (Big Picture page 1500 x 844 css at 1.28 scale = 1920 x 1080). The panel page read 855 x 766 on the monitor too, so that number does not tell the two screens apart. Use the Big Picture page's size.
- Keep-awake: taken at 00:36 EDT with 480 minutes. `expiresAt` 2026-10-22T12:36:57Z.
- Settings backup: `/home/deck/p97-settings-backup.tgz` (209717980 bytes), plus the older `/home/deck/p96-settings-backup.tgz`. The rig's own snapshot tool failed three times (see below), so there is no rig snapshot.
- Ollama models: gemma4:e2b-it-qat (4336358185 bytes) and nomic-embed-text:latest (274302450 bytes). Same at the end.
- Test chat "test" (chat 1 of 1) is open on the Main tab. Plugin open. No game running. Text size Small.
- settings.json md5 4786b12b8f6f7a215f0e9f8c316d3da8 at start and at end.

## Settings changed and whether they are back

- Run AI on this Deck: ON -> OFF (plugin switch) -> ON. Back.
- Text size: Small -> Large -> Small. Back. (It was Small at the start, not Normal; I put it back to Small.)
- Developer tab switch: was already on. Not changed.
- One extra question in the test chat ("what is a good first build to learn the basics"); the test chat now ends with that answer and a clarifying menu. The "New chat" view I opened for the help chip was unsaved and is gone (chat 1 of 1).

## Evidence files

- plan97-A-SETUP, plan97-QA-LOOK-monitor-{main,ollama,settings,permissions,developer,about,search} (all clean), plan97-P89-RIG-OPEN-AFTER-RELOAD (FAIL), plan97-P89-RIG-SNAPSHOT (FAIL), plan97-A-CLEAR-CACHE (PASS), plan97-A-FINDLAN-UP, plan97-A-DECKY-BUTTON, plan97-A-KEYBOARD-FUNCS, plan97-A-RENAME-RIG, plan97-A-CLIPPED-LINES, plan97-A-LARGE-TEXT, plan97-A-GHOST-NOGAME, plan97-A-TAB-ICONS, plan97-A-HELP-CHIP-RING.

## Odd things

- Opening the plugin after a reload fails on the first try every time (2 of 2 counted rounds). The tool waits for the Quick Access page, not for the plugin's rail entry. Waiting 90 s with the menu open did not bring the entry back. Closing and reopening the menu did. In round 1 the reload call returned "Connection closed" (the tool server dropped), so that round is not counted.
- `deck_snapshotSettings` fails on this 226 MB settings folder: "streamed restore to the Deck failed ... tar: Skipping to next header". Three tries, same error. Live settings were untouched (md5 and folder dates checked). It also holds a 15 minute lease.
- The Deck started with the screensaver on; one L3 click woke it.
- UP from Find LAN lands on the "Start the AI with the Deck" switch 5 of 5; the address box is not a stop on that route. DOWN from that switch goes to the Save row, then to Find LAN.
- The chats menu has no "Sum up this chat" entry here; it says "Sum up again" (dimmed) and the toast says the chat is already summed up. One more question did not enable it. I opened the rename box with the menu's own "Rename chat".
- The Steam keyboard (rename box) appeared only after A on the field, not on open. B closes the keyboard, a second B closes the box.
- At Large text, Settings > Story spoilers (Strategy mode) loses its summary and the chevron sits 2.6 px from the panel edge (needs 8).
- The "How to use bonsAI" chip is not on the Main tab of this Deck, even in an empty chat (first-run only). A9's pop-up route and A12's help chip half could not be run for that reason.
- The passive ghost watcher (`window.__ghost`) is still sampling on the Quick Access page until the next plugin reload.
- The session should check the maintainer's phone notifications (not mine to check).
- Screenshots are saved by the rig into `C:\Users\still\Documents\BonsAI\screenshots\`; the ones used as evidence were copied beside the evidence files.
