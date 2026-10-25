# Plan 100 block L0 handover (2026-10-25, 17:55 to 18:14 EDT)

Build on the Deck: dist/index.js sha256 prefix 2e8d78cd3774 (same as the repo's dist/index.js; no deploy this block).
Keep-awake: held at 17:55 EDT, expiresAt 2026-10-26T05:55:15Z (480 min). Not released; renew or release with deck_restorePowerSettings.
Settings backup: /home/deck/p100-settings-backup.tgz (207936537 bytes). No deck_snapshotSettings snapshot was taken.
Test chat: no chat named "test" exists. Used chat "In Hollow Knight, how do I beat the Mantis Lords" (now 44 earlier entries plus the 2 new answers; it is chat 2 of 3). New chat made in L0.6: "Deep Rock Galactic: Survivor" (chat 1 of 3, 4 questions in it). Chat list is now 3 saved chats.

Library state BEFORE L0 (block LR puts it back here):
- rag_corpus_version 2026.10.25, rag_corpus_path /home/deck/.bonsai/rag
- files: ATTRIBUTIONS.md 26743 B, corpus-manifest.json 29868 B, corpus.db 3145728 B, all 2026-10-25 15:29:39 -0400
- seed folder version 2026.10.25; published version 2026.10.25
- L0 did not touch the library (Ollama tab read: Installed, version 2026.10.25, 38 games).

Settings changed and whether back:
- ask_mode: speed -> strategy (chip) at the start; BACK to speed (read in settings.json 18:13).
- show_developer_tab: false -> true (Settings > Data switch, for the Developer walk in L0.8); BACK to false (read back).
- spoiler_tier stays default. Nothing else changed. rag_demote.json still {"version":1,"notes":{}}.
Ollama: models tags unchanged (nomic-embed-text, gemma4:e2b-it-qat); api/ps empty at the end. Plugin never reloaded.

Recent Games row as read at the start (app ids in order): Deep Rock Galactic: Survivor, God of War, Black Mesa, Half-Life 2, Hollow Knight, Hades, Brotato, Left 4 Dead 2, Call of Juarez Gunslinger, Sifu, Stardew Valley, 1174180 (Red Dead Redemption 2), 35140 (Batman Arkham Asylum), 440 (Team Fortress 2), GTA San Andreas Definitive, Cyberpunk 2077. Doom 64: Retribution (non-Steam 2781880966) was not on it. After DRG Survivor was played, a walk saw "Deep Rock Galactic: Survivor, Doom 64: Retribution, DOOM 64, God of War..." by name but the launch tool matches by app id and cannot match non-Steam tiles.

Rows (evidence files in C:\Users\still\Documents\bonsAI-workshop\test-evidence\):
- L0.0 SETUP: PASS (plan100-P100-L0-SETUP.json/.png)
- L0.1 KB-SMOKE: PASS, plus UNCLEAR on the notes-agree half (third note shows as "Boss note (spoiler)" on screen, "False Knight" in the log) (plan100-P100-L0-KB-SMOKE-02.json, -details.png)
- L0.4 DEMOTE pictures: not run, done in plan 98 KS (plan100-P100-L0-DEMOTE-01-pictures.json)
- L0.5 ROUTE-CHEAT-COUNT: MEASURED 0 of 2 (plan100-P100-ROUTE-CHEAT-COUNT.json/.png)
- L0.6 JUNK-PHRASES-try2: thank-you FAIL, what-time FAIL, follow-up PASS (plan100-P98-JUNK-PHRASES-try2.json, -time.png, -beatit.png)
- L0.7 STRAT-SPOIL-NAME-01: COULD NOT RUN (plan100-STRAT-SPOIL-NAME-01.json)
- L0.8 K1-REPLAYS: four PASS (plan100-P98-K1-REPLAYS.json). Old walk files copied to scratch deck-L0/old-walks.
- L0.9 PHASE4-CHIPS-01: MEASURED (plan100-P100-PHASE4-CHIPS-01.json, -chips-1..3.png)

Deck as left: Main tab of the plugin open on the test chat, ring on the mode chip (Speed). No game running; main window on the Library page (a failed Doom 64 launch left it there). QAM open. Screen: Deck's own (854x454).

Quirks tonight:
- deck_readPluginLog returned "No entries" (journal read empty); the attach lines were read with journalctl over SSH (grep "kb: " and "notes for this answer").
- Result sizes: deck_walkTo, deck_saveCheck and deck_openPlugin return thousands of lines; ask for less in your own notes.
- deck_launchGame found Survivor via the Library grid because the ring started on the shelf's second tile (God of War), not the first.
- After an answer finishes, the text cursor sits in the question box (focus on the box); never press A there. A walk Down to "Ask" (exact) skips the box.
- Opening the plugin worked first try. The plugin opens on the Settings tab if that was last used; Main is two LB presses left of Settings.
- Sweeps/replays hash the repo's plugin files, not the Deck's; both match today (dist sha 2e8d78cd3774).
- The test chat summed itself up before the first answer ("The chat summed itself up before this answer"); no "Couldn't sum up" line this time.
- Answers in the HK chat call Dirtmouth/Greenpath the way to the first boss (muddled advice, not measured here).
