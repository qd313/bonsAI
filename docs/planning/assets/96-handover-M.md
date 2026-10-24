# Plan 96, Deck block M: handover

Written by the block M driver, 2026-10-17 about 23:50 (Deck clock).

## State the Deck is in

- Build on the Deck: bundle sha256 starts 61cdad9411ca, plugin.json says 0.5.0. No deploy was done.
- Live screen: the Deck's own screen (window 855 x 766, panel 300 wide).
- Keep-awake: taken at 23:32 with 480 minutes, runs out 2026-10-18T11:32:35Z (07:32 Deck time). Still held at 23:50.
- Settings backup: /home/deck/p96-settings-backup.tgz on the Deck (209 MB, made 23:32 before any change).
- Test chat name: "Which charm should a beginner get first in Hollow Knight" (the only chat, "chat 1 of 1"). It now has 88 turns (was 64): ten questions for F8 and two stopped ones for R2.
- Plugin open on the Main tab, that chat open, ring last on the Main tab after an LB press from the Ollama tab, mode chip Speed, game: none running.
- Which AI answered: the Deck's own Ollama, gemma4:e2b-it-qat (ollama_local_on_deck true). It is loaded in memory now.

## Settings changed and put back

| Key | Was | Changed to | Now |
|---|---|---|---|
| preset_single_chip | false | true (for the one-chip reading) | false, read from the file |
| use_local_knowledge_base | true | false (for the stopped-answer tries) | true, read from the file |
| ask_mode | speed | expert (via the chip, for the Expert set) | speed, read from the file |

All three were changed through the plugin's own screen, never by editing the file. No other key was touched.

## Evidence files (all in C:\Users\still\Documents\bonsAI-workshop\test-evidence\)

plan96-P96-M0-SETUP.json, plan96-P96-F8-EXPERT.json, plan96-P96-F22-CHIP-MEASURE.json (plus -two-chip-raw.json, -one-chip-raw.json, -two-chip.png, -one-chip.png), plan96-P96-F25-ASK-PILL.json, plan96-QA-LOOK-<Main, Ollama, Settings, Permissions, Search, About, Developer>.json with a .png each, plan96-P96-R2-STOP-NOCARD-1.json and -2.json with a .png each.

The rig saved its own screenshot copies in C:\Users\still\Documents\BonsAI\screenshots\ (DeckCapture_20261017_2343*.png to _2349*.png, 13 files). I copied them to the workshop and left the originals.

Scratch scripts (the page watcher, the measure script) are in the session scratchpad folder.

## Results in one line each

- M0 setup: PASS.
- F8 Expert against Speed: FAIL. Expert median 511 characters, Speed median 551. Expert was also slower to first word (31.0 s against 25.8 s).
- F22 chip row: MEASURED. Two-chip row cuts the chip words off in every reading; the one-chip row does not.
- F25 Ask pill: MEASURED. 53 x 22, content 56 wide against 51 inside.
- QA-LOOK: Settings, Permissions, Search, Developer, Ollama clean. About: one finding (the "Follow system" language button is a light button). Main: 14 findings (edges touching, Ask text does not fit 56 against 51, lopsided rows).
- R2 STOP NOCARD 1: PASS (3 presses to the question box, no repeat).
- R2 STOP NOCARD 2: Down chain PASS (4 presses, no repeat) but UNCLEAR as a no-card test: a notes card was drawn with the knowledge base switch off.

## Quirks tonight

- The lease row in deck_status named another process (pid 15652, purpose deck_pressButton) with heldByOther false and an expiry already past. I treated that as not held. Focus never moved on its own. The ring does jump to the question box by itself right after Ask is pressed (plugin behaviour).
- openPlugin: first try failed once as expected, second worked.
- Walking LEFT from Ask skips the mode chip and lands on Attach screenshot; walk RIGHT from there to reach the chip.
- Each answer carries 13 to 23 s of silent "reasoning" before the first word on this AI, so first-word times are 24 to 35 s. A loading line ("Waking the model up", "Still chewing on it") shows meanwhile.
- Foldable sections (Settings, Ollama) collapse again by themselves when you leave the tab; "Open all" opens every section until you leave.
- The question script, the page watcher and the measure script all connect to the same debugging port without trouble while the rig presses.
- Free memory read 312 MB free, 6135 MB available at 23:50 with the model loaded.
