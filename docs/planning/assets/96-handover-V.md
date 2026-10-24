# Plan 96, Deck block V: handover

Written by the block V driver, 2026-10-18 about 00:12 (Deck clock).

## State the Deck is in

- Build on the Deck: bundle sha256 starts 61cdad9411ca, plugin.json says 0.5.0. No deploy was done.
- Live screen: the Deck's own screen (window 855 x 766, panel 300 wide).
- Keep-awake: still held from block M, runs out 2026-10-18T11:32:35Z (07:32 Deck time). Not renewed.
- Settings backup: /home/deck/p96-settings-backup.tgz (block M's, untouched).
- Test chat name: "Which charm should a beginner get first in Hollow Knight" (the only chat, "chat 1 of 1"). It now has 94 turns or so: three voice questions (36, 82, 82 characters) plus their answers were added.
- Plugin open on the Main tab, ring on the first chat entry ("46 earlier"), no game running.
- The plugin was reloaded twice by this block (once for the capture override, once after the put-back). The Deck's AI model is no longer loaded in memory (free memory read 6.8 GB at 00:09), so the first answer after this will be slow again.

## Settings changed and put back

| Item | Was | Changed to | Now |
|---|---|---|---|
| settings.json keys | not touched | not touched | preset_single_chip false, use_local_knowledge_base true, ask_mode speed, voice_stt_model base.en, microphone_access true (read at 00:09) |
| Mic permission | already on | not changed | on |
| Capture override file voice_capture_target | did not exist | created with `p96mic.monitor` | removed |
| Pretend sink p96mic (module 536870916) | none | loaded | unloaded (no p96 sink left) |
| /tmp/p96.wav | none | copied | removed |

The override file was written over plain SSH and the permission check did not refuse it.

## Evidence files (all in C:\Users\still\Documents\bonsAI-workshop\test-evidence\)

- V1: plan96-P96-F7-ASK-WHILE-1.json, -2.json, -3.json (no screenshots).
- V2: plan96-P96-R1-TRIGGER-1.json to -3.json (trigger A, plan 94's), plan96-P96-R1-TRIGGER-B-1.json to -3.json (trigger B, the paperclip screenshot), plan96-P96-R1-CONTROL-1.json to -3.json.

Scratch scripts (the page watcher, the timed Ask press, the WAV maker) are in the session scratchpad folder: watch.py, orch.py, mkwav.ps1 (mkwav in mkwav.ps1).

## Results in one line each

- V1 try 1 (Ask 2.0 s into the sentence): FAIL. Sent 36 of 82 characters: "How do I beat the final boss in this".
- V1 try 2 (Ask 5.0 s in): PASS, all 82 characters.
- V1 try 3 (Ask 8.0 s in): PASS, all 82 characters.
- V2 trigger A: MEASURED, stuck 0 of 3. hasFocus is false only while the Steam pop-up is open, true again right after B.
- V2 trigger B: MEASURED, stuck 0 of 3.
- V2 control: MEASURED, stuck 0 of 3.

## Things worth knowing

- The page's own "ring" and the page's active element always matched. There was no split.
- Trigger B left three real screenshots in Steam's screenshot folder: /home/deck/.local/share/Steam/userdata/23333482/760/remote/7/screenshots/20261018000627_1.jpg, ...000654_1.jpg, ...000712_1.jpg. There were also seven other new files there from 00:02 to 00:04 (20261018000231, 000245, 000250, 000400, 000405, 000449, 000453), written around my menu close-and-reopen chords. I did not press the screenshot chord; I do not know what made them. Left in place.
- After a plugin reload the Quick Access rail has no Decky tab until the menu is closed and opened again with the chord; then openPlugin works. Both reloads this block needed this (first openPlugin failed twice, then the chord, then it worked).
- Settings > Data: the section stays open across a menu close-and-reopen but folds when you leave the tab.
- About tab: Down from "Bugs & Feature Requests" does not move the ring, though a fourth link ("Support my Steam Sale habit") is on the page (the walk stalled on the third link). I did not try Right.
- Settings: the "Story spoilers" line and the Ollama tab's first line ("Where AI runs") show 92 percent visible, clipped by the same element (rig reports it as focused-but-not-fully-visible, every time).
- Tool calls take 1 to 3 s each, so the timed Ask presses came from a script on the PC (pad.py through the same controller board) that started the sentence and pressed A at a fixed delay. The ring was put on Ask before the sentence started.
