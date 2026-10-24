# Plan 96, Deck block D: handover

Written by the block D driver, 2026-10-18 about 01:10 (Deck clock). Evidence is in `C:\Users\still\Documents\bonsAI-workshop\test-evidence\` as `plan96-<ROW>.json`. Times written inside the evidence rows after the cold-start row can run up to 25 minutes ahead of the Deck clock.

## State the Deck is in

- Build on the Deck: commit a29f9eb0 (deployed by the session at 04:30 UTC). The bundle hash starts 058833fbdcdb. No deploy by this block.
- Live screen: the Deck's own screen (window 855 x 766, panel 300 wide).
- Keep-awake: renewed at the start with 480 minutes, runs out 2026-10-18T12:27:31Z (08:27 Deck time).
- Settings backup from block M: `/home/deck/p96-settings-backup.tgz`. A copy of the settings file taken during block D: `/home/deck/p96-settings.json.bak` (same content as the file now).
- Test chat: "Which charm should a beginner get first in Hollow Knight", chat 1 of 1, now about 108 turns. The chat summed itself up once on its own (during the Strategy question).
- Plugin open on the Main tab, ring on the tab bar. No game running (checked: no process). Deck's own AI unloaded (api/ps empty).
- Mode chip is on Speed.

## Settings changed and whether they are back

| Item | Was | Now |
|---|---|---|
| microphone_access | true | true (turned off for F11, put back, read from the file) |
| preset_single_chip | false | false |
| ask_mode | speed | speed (Strategy for F4, put back) |
| ask_think_effort | medium (Balanced) | medium (Brief for F3, put back; the runbook said Off, the original was Balanced) |
| ollama_local_on_deck | true | true (off for F1, put back) |
| model_policy_tier | open_source_only | open_source_only |
| settings.json as a whole | - | removed for N3 and copied back; md5 equal to the backup |
| PC address (page storage `bonsai:pc-ip`) | 192.168.86.27:11434 | set back by hand to 192.168.86.27:11434. The fresh-start row cleared the page storage; see quirks |

## Results in one line each

- F11 hint ring: FAIL (Down from Open Permissions moved to Dismiss; all else matched).
- F22 chip pace and size: FAIL for the two-chip pace (4 to 12 s, 8 of 13 under 9 s), PASS height 26 px, one-chip pace PASS, text 9.9 px because the Deck is on Small text size (UNCLEAR for 11 px).
- F25 Ask pill: FAIL, the finding is still there (56 against 51).
- F5 picker: grid half PASS; the answer FAIL (the AI gave "incomplete stream" twice with a picture attached).
- F6 explain: FAIL. A on Explain further does nothing, B does nothing; the ring is trapped in the box until the plugin is reloaded.
- F1 no AI: answer text PASS; the "Open the Ollama tab" control does not exist (FAIL).
- F4 tick: FAIL. The checklist steps cannot be reached with the D-pad. F19 checkboxes PASS (role checkbox). F20 note PASS.
- F14 sum up: UNCLEAR (long chat, the control reads "Sum up again", not greyed).
- F2 cold start line: PASS (line at about 9.5 s after Ask, gone about 2 s later, first word about 11 to 13 s).
- F3 thinking: UNCLEAR for the first pick (no notice from Balanced to Brief), PASS once the notice opened (Off then Brief).
- F26 bare address: PASS. F23 host buttons: PASS (no findings). F13 and F10: COULD NOT RUN (Ollama installed), the install line is absent.
- F15 KB count: PASS (38 games). F18 and F21 pills: PASS for qwen2.5vl:3b, UNCLEAR for qwen2.5:3b (row not listed).
- F9 voice refresh: COULD NOT RUN (engine ready). N2 search: PASS. N3 fresh start: PASS for the notices and the restore, UNCLEAR for the help chip. F16 about links: PASS.
- QA-LOOK2: Main one finding (Ask 56 against 51); Ollama, Settings, Permissions, Search, About, Developer clean. (The older "Follow system" finding did not show.)
- D3 free-play: PASS, no dead press; the chat-name row is only 83 percent visible (FAIL on that stop).

## Quirks tonight

- The Quick Access chord (hold Guide, tap A) sometimes toggles nothing while the box in a pop-up holds focus. What cleared the trapped box was a plugin reload; a chord close-and-reopen did not.
- Screenshots taken with the rig show a "Screenshot Taken" toast and add a file to Steam's screenshot folder. That explains the extra screenshot files seen by block V.
- After the plugin is reloaded the Quick Access rail has no bonsAI tab until the menu is closed and opened again with the chord.
- With the game running, putting text in the box with the script left the D-pad dead once (page had no focus); the chord twice cleared it and emptied the box.
- A question with a picture attached came back as "incomplete stream" both times (20 s, payload 570 KB). The AI had just been loaded.
- Fresh start (N3) also cleared the page storage flags (help dismissed, thinking notice accepted, note offers, pull badge, download sites). The Thinking notice will show again on the next Off-to-Brief pick, and the help chip is back.
- The Ollama tab "Where AI runs" fold: Down from "Save current PC address" goes to Knowledge base; Test connection is reached going Up. Folds close on their own when you leave the tab.
- Free memory stayed above 8 GB available with the AI and the game together.

## Not done

- F4 second half (ticks surviving reopen, no-game repeat): the steps cannot be reached.
- F13 and F10 install box, F9 voice reinstall: need a Deck without Ollama or without the voice engine.
- F11, F22 text size at Normal, F14 short chat: need the stated starting conditions.
