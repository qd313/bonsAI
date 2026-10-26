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
