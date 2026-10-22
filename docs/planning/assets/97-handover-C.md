# Plan 97, Deck block C (the owed checks, no game): handover

Written by the block C driver, 2026-10-22 about 09:15 Deck time (13:15 UTC). Evidence folder: `C:\Users\still\Documents\bonsAI-workshop\test-evidence\` (files `plan97-<ROW>.json`, pictures and raw timelines beside them). Read `97-handover-B.md` too; everything it says still holds unless changed below.

## State the Deck is in

- Build on the Deck: commit 73738058 (bundle sha256 starts 8bdfff8b7f5e). No deploy.
- Screen: panel page 855 x 766 (a monitor at 1920 x 1080 for screenshots; the Deck page height has read 766 and 845). A Gamescope performance overlay is drawn top left (not mine).
- Keep-awake: renewed 08:25 EDT, 480 minutes, `expiresAt` 2026-10-22T20:25:14Z. Still held.
- Plugin open on the bonsAI tab (main), Quick Access open. No game running (checked with pgrep).
- Mode chip: put back to **Strategy** (read: "Inference mode: Strategy"; settings file `ask_mode` strategy). Block B had left it on Speed.
- Settings file md5 is 4786b12b8f6f7a215f0e9f8c316d3da8, the same as block A's end. Internet downloads ON. Block A's tar backup (`/home/deck/p97-settings-backup.tgz`) stands; no rig snapshot taken.
- Ollama: running through the user service `bonsai-ollama-autostart.service` (active). Models: nomic-embed-text and gemma4:e2b-it-qat (2 before C6 and 2 after; same names). Nothing loaded right now (api/ps empty). **The program is now version 0.40.8** (it was 0.40.6 when block C began): the "Update AI & models" press in C3 upgraded it. That is a lasting change.
- Voice engine: original `voice_bin` folder back in place (whisper-cli ready); speech models untouched.
- Knowledge library: removed and downloaded again in C5, same version 2026.10.17, at /home/deck/.bonsai/rag; the switch is on.
- Test chat "test": still chat 1 of 1, 158 turns. Block C added 11 questions and answers (10 for Expert against Speed, 1 for the note offer card).
- No `.p97` folders are left on the Deck (checked: ~/.local/bin, ~/.local/lib, ~/.ollama, voice_bin).

## Settings changed and whether they are back

- Ask mode chip: Strategy at start of C, set Expert then Speed for the tests, **back to Strategy** at the end.
- Permissions, Internet downloads: ON at start; switched OFF for C6's F10 half; **back ON** (file read true).
- Page storage: a new key line `bonsai:note-offers-handled-v1` was written by the plugin itself when I dismissed a note offer. Not mine to revert.
- Knowledge base switch: went off with Remove, on again after Download (file and screen agree, true).

## Rows, one line each

- P96-F8-EXPERT: PASS. Expert median 713 characters, Speed median 572; Expert longer in all five pairs; both parts answered 5 of 5 and 5 of 5. First word: Speed 24.5 to 32.5 s, Expert 30.7 to 38.1 s.
- P93-B10-CANCEL (owed half): PASS with a question. Two saved walks, `P93-B10-CANCEL-OLLAMA-SWEEP-2026-10-22` and `P93-B10-CANCEL-OLLAMA-OPEN-DOWN-UP-2026-10-22`, both in the workshop `checks/` folder. No dead press, no stop twice. The AI models screen walk was not re-recorded (the session should say whether it was meant; the likely old file is plan92-P91-MODELS-COLUMN-WALK).
- P96-F2-COLD-START (warm-up half): PASS. Model loaded 14 s after the done line; log line "preload_ask_model: warmed gemma4:e2b-it-qat". Caveat: `dev_preload_ask_model` is on in settings.
- P93-B6-NOTE-OFFER: COULD NOT RUN for the screen-only reload (reloading the Quick Access page blanks it and Steam does not rebuild it); UNCLEAR after a plugin reload (card did not come back, handled mark kept). Do not use that route again.
- P97-L20-KB-SWITCH: PASS. Screen and file agreed at close, +30 s, +60 s. One read about 1 s before the download finished had the file on and the screen off.
- P96-F13-INSTALL-WORDS: half 1 FAIL (the downloads-ON box says "Cancel or B installs Ollama only", and Cancel really installed Ollama); half 2 PASS (the "isn't installed yet" line goes and the button reads Update AI & models).
- P96-F10-CANCEL: PASS. The downloads-OFF box says "Cancel or B installs nothing"; Cancel left the status line unchanged and nothing was installed.
- P96-F9-VOICE-REFRESH: PASS. The section read ready about 2 s after the last engine file landed, with the toast, on the same tab; 81.9 s from the press.

## Odd things for the next driver

- `deck_openPlugin` can say "already open" (verified true) right after a plugin reload while the panel is closed. Read `.bonsai-scope` first. Three times tonight my next walk landed on Steam Home or the wrong tab. Once an A on Steam Home opened the Cyberpunk 2077 game page (no game started; B closed it).
- After a reload the plugin resumes on whatever tab it was on (the Search tab once). The tab order is Search, bonsAI, Ollama, Settings, Permissions, Developer, About; a walk with a loose label ("tab") lands on the nearest tab.
- Reloading only the Quick Access page through `location.reload()` leaves a blank page and Quick Access gone until `deck_reloadPlugin`.
- The sweep tool writes its own evidence into the repo's `runs/` folder (ignored by git): `runs/p97-C2-ollama-sweep.json`. A copy is in the evidence folder.
- Never put `pkill -f ollama serve` in an ssh command line: it kills the ssh shell itself. Stop the user service instead.
- The mode list opens with the ring on its first entry whatever the current mode is.
- Answer timing: a poll of the panel text shows the first word as a sudden drop then fast growth in text length after the thinking lines.

## Rows left undone

- The AI models screen saved walk (P93-B12-MODELS-WALK) was not re-recorded (see above).
- The F13 confirm route (A on "Install Ollama and the starter models") was not run, on purpose: it downloads about 4.5 GiB.
- P93-B6-NOTE-OFFER stays "proven by its tests only" plus the weaker evidence.
