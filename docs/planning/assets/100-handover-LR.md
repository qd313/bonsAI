# Plan 100 block LR handover (2026-10-25 23:24 to 23:31 EDT)

Build on the Deck: 222279568b09. Keep-awake: released.

## Retries (new empty chat each time, Strategy, nothing running)
- TIPS-01-try2: PASS. Attach line: kb: domain=compat route=compat_tips attached=3 [Shared troubleshooting crash x3]. The crash tip attaches when no chat game is in the way. File plan100-P100-TIPS-01-try2.json.
- FOUR-GAMES-01-try2 (GTA body armor): FAIL. Attach line: 'question chose nothing -- notes and tips not searched (domain=none)'. aliases for game_id 9 = [('gta san andreas definitive', 9), ('gta sa de', 9)] (columns alias_normalized, game_id). So "gta san andreas" and "grand theft auto san andreas" do not match; add them as aliases. File plan100-P100-FOUR-GAMES-01-try2.json.

## Restore (row P100-LR-RESTORE, file plan100-P100-LR-RESTORE.json)
- Mode chip Speed (read). Developer switch off (show_developer_tab false). spoiler_tier default.
- Library: Remove, then "Download knowledge base" > Internal storage. Read back version 2026.10.25, path /home/deck/.bonsai/rag, corpus.db 3,145,728 bytes dated Oct 25 23:28.
- Pinned test chips: none. Models: nomic-embed-text:latest and gemma4:e2b-it-qat (same as L0), unloaded. No game running.
- Left for the maintainer: ~/Desktop/bonsAI_logs/suggested-tips/game-20261026-014251.json, and /home/deck/p100-settings-backup.tgz.
- "Save files to Desktop" is on (the L0 handover did not say whether it was on before; this block found it off at the start).

## Deck as left
Plugin open on the Ollama tab, 5 saved chats (two new ones from the retries; delete them if the maintainer wants the old three). Screen: Deck's own.

## Surprise
After Remove the capture showed a black frame with a logo for about 90 s and the QAM page read as shut; Steam stayed up, and reopening the plugin showed the Download button.

## Addendum (after the peer's request)
- "Save files to Desktop" switched back OFF in the Permissions tab (it was off at the start of the L2 block). Read back from settings.json: filesystem_write = false.
- Keep-awake: no lock held (systemd-inhibit shows none). Plugin left on the Permissions tab.

## Retry round (2026-10-25 23:50 to 2026-10-26 00:07 EDT)
Build 222279568b09, Python redeployed 23:53, seed library 2026.10.26 (corpus.db 3,424,256 bytes) installed through the Developer tab for the tests.
- P100-TIPS-01-try3: PASS. Attach line: kb: question chose domain=compat route=compat_tips attached=3 [Shared troubleshooting - crash x3]. Also PASS in a chat whose own game was Hollow Knight (same attach line, no Hollow Knight notes).
- P100-THANKS-01-try2 (Deep Rock Galactic: Survivor running): PASS. "thanks a lot" -> "You are welcome." (4 words); "what is the date today" -> "I cannot tell you the date today." (8 words); neither had a notes block or "Not in my notes" line. "how do I kill them" -> about the Exploders, attached [Exploder; Acid Spitter; Dreadnought Twins] (59 s).
- P100-FOUR-GAMES-01-try3 (GTA): PASS. Attach line: route=text:grand theft auto san andreas the definitive edition attached=3 [GTA San Andreas DE - Body Armor; Health pickups; Police bribes], in a Hollow Knight chat, nothing running.
- Restore (P100-LR-RESTORE-try2): mode Speed; Developer tab off; library Remove then Download, read back 2026.10.25, 3,145,728 bytes, dated Oct 26 00:05; filesystem_write false; spoiler_tier default; test chips none; models unloaded; no game; keep-awake released.
- Slip: pressing Down then A on the open Knowledge base fold landed on the "Use local knowledge base" switch and turned it off; I turned it back on at once (read back true after the download).
- Deck as left: plugin open on the Ollama tab, 6 saved chats (new ones from the retries).
