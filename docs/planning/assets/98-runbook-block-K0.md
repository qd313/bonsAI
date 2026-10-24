# Plan 98, Deck block K0: the knowledge-base smoke pass, the readings the second opinion needs, and the owed rows

For a fresh deck-driver helper, at minute zero of the session, on the build already on the Deck (no deploy). Read
`workshop:planning/assets/97-handover-I.md` first (the last known state of the Deck: the test chat "test", the settings
backup at `/home/deck/p97-settings-backup.tgz`). The rules of your helper file apply in full. Evidence files go to
`C:\Users\still\Documents\bonsAI-workshop\test-evidence\plan98-<ROW>.json` (never overwrite; `-try2` if the name
exists), screenshots beside them with the same stem. Every Deck command is exactly `ssh deck@192.168.86.52 '<command>'`.
Scratch files go in the session's scratch folder named in your task. Stop at once if the rig's lease is held by another
chat, if focus moves without your press, or if anything asks for a password. About fourteen checks; if your memory runs
low, write the handover and stop, naming the rows left.

**Questions** go in with the send-question script, never by pressing A on the question box:
`ssh deck@192.168.86.52 'python3 - --text "the exact question"' < scripts/deck_send_ask.py`, check it printed VERIFIED
with the whole sentence, then walk to Ask and press A there as its own step. Every question below is worded once and
never repeated word for word (the answer cache would serve it back). Wait for the answer to finish (the reply row
appears) before any read. **Before every question, read the chat's name: it must be "test".**

**Page reads** go through the debugging port the way `scripts/probe_deck_ui_look.py` does. **The log's attach line**
for a question is read with `deck_readPluginLog` right after the answer finishes: it is the one plain line saying which
notes reached the model ("attached", the count and the note names) and which footer line, if any, was added; copy it
whole into the evidence. **The saved chat** lives in the plugin's settings folder, in its `chats` folder
(`~/homebrew/settings/bonsAI/chats/`); copy the last 600 characters of the newest answer into the evidence whenever a
check is about what the AI wrote (key names only from any settings file; never its values).

## K0.0: setup (row P98-K0-SETUP, one file)

1. `deck_status`: the stop switch must be off and no other chat's lease held. If either, stop and report.
2. `deck_holdAwake` with `ttlMinutes: 480`; write the `expiresAt` into the evidence and the handover.
3. Which screen is live: the page's window size (the Deck's own is about 854 x 766 for the panel page; the monitor
   1920 x 1080). Record it in every evidence file as `screen`.
4. The build on the Deck: `sha256sum ~/homebrew/plugins/bonsAI/dist/index.js | cut -c1-12`. Block K0 runs on it.
5. Back up the settings: `tar -czf /home/deck/p98-settings-backup.tgz -C ~/homebrew/settings bonsAI` (print the size).
   Never print the settings file's values: key names only.
6. **The library's state, before anything changes it:** the installed version and place (the keys `rag_corpus_version`
   and `rag_corpus_path` in the settings file: print the version, and print the path value too, it is a folder name and
   not a secret), the library's file dates (`ls -l --time-style=full-iso <path>/`), and the seed folder's version:
   `python3 -c "import json;print(json.load(open('/home/deck/homebrew/settings/bonsAI/seed-knowledge-base/corpus-manifest.json'))['version'])"`.
   The published version: `curl -sL https://huggingface.co/datasets/qd313/bonsai-knowledge-base/resolve/main/corpus-manifest.json | python3 -c "import json,sys;print(json.load(sys.stdin)['version'])"`
   (if that address refuses, read the version the Update press logs in K0.8 instead). Write all four into the handover:
   block KR puts the library back exactly here.
7. Ollama's state: `curl -s 127.0.0.1:11434/api/tags` (names and sizes only), `curl -s 127.0.0.1:11434/api/ps`,
   `free -m`, `df -h /home`, and how many models it keeps loaded (`systemctl --user show-environment | grep -i ollama`,
   and `systemctl --user cat ollama 2>/dev/null | grep -i MAX_LOADED`). The model list at the end must match.
8. The test chat: open the plugin (it may fail once after a reload; a second failure is worth reporting), read the chat's
   name on the Main tab. It must be "test". If it is not there, stop and report.
9. The mode chip reads Strategy for every question below unless a check says otherwise; read it before each question.
10. The parental lock must be off (Settings → Permissions shows no lock banner).

## K0.1: the knowledge-base smoke pass, part one, nothing running (row P98-KB-SMOKE-01)

Strategy mode. Question: "In Hollow Knight, how do I beat the Mantis Lords" (the boss is named, so no cover is
expected). **Pass when:** the answer finishes; a "From the notes" block appears under it naming a Hollow Knight note
("From the Hollow Knight wiki"); Show details' notes chip names at least one note; the log's attach line names the
same note(s); no "No close match" line and no "Not in my notes" line. Record the block's title, the notes named, the
attach line, and whether any cover was drawn (there should be none: the boss was named).

## K0.2: the game, and the smoke pass part two (row P98-KB-SMOKE-02)

1. **Unload the Deck's AI first** (a game plus the loaded model left under 2 GB free on 2026-10-10): read the loaded
   model's name from `/api/ps`, then
   `curl -s 127.0.0.1:11434/api/generate -d "{\"model\": \"<that name>\", \"keep_alive\": 0}"`, and confirm `/api/ps`
   is empty. Record `free -m`.
2. Launch Deep Rock Galactic: Survivor with `deck_launchGame` (go to the start of the Recent Games row first). Wait
   until its window has been in front for 30 seconds. Close and reopen Quick Access; the Context line must name the
   game. Never reload the plugin with the game running.
3. Strategy mode. Question: "what should I spend nitra on first in this run". **Pass when:** the answer finishes, a
   "From the notes" block names a Deep Rock Galactic: Survivor note (Nitra, or a mining note), Show details names it,
   and the attach line agrees. Record the same fields as K0.1, plus `free -m` after the answer.

## K0.3: the four readings for the second opinion (rows P98-NOTES-BLOCK-04-READING-1 to -3 here, -4 in K0.7)

Deep Rock Galactic: Survivor running, Strategy mode, the Deck's own AI. Three questions, one evidence file each, each
with: the exact words sent; the notes attached (names, from Show details and the attach line, with the scores the line
prints); whether a "From the notes" block was drawn and its title; whether the "No close match" line or the "Not in my
notes" line showed (read the answer's last lines on screen and in the saved chat); the answer's last 600 characters.
These are readings, so the verdict is **MEASURED**, with one line saying what a player saw.

1. "Who is the final boss called Zorblax in this game" (a made-up boss; on 2026-10-22 three weak notes attached and the
   line showed).
2. "How do I defeat the boss named Grimthak in this game" (made up; on 2026-10-22 two weak Dreadnought notes attached,
   a block was drawn and no line showed).
3. "How do I buy a house in this game" (on 2026-10-14 three notes attached — Gold, Nitra, mining — a Gold block and no
   line).

## K0.4: the two junk phrases (row P98-JUNK-PHRASES)

Still with the game running, Strategy mode. Two questions, one file with two halves: "thank you very much" and "what
time is it". Record for each the notes attached (the attach line) and whether a block was drawn. In August both
attached notes (Nitra; Dreadnought, Praetorian and Classes); the September floors may have cured it. **Verdict
MEASURED** with the counts (a pass for a half is "nothing attached, no block").

## K0.5: the widest chip labels (row PHASE4-CHIPS-01)

Main tab, the game running, the panel open on the chip row. Every 10 seconds for two minutes (12 reads) read each
visible suggestion chip's label text and the boxes of the label and of its chip (text-range rectangles for the label,
`getBoundingClientRect` for the chip), through the debugging port. **Pass when:** no label's text box runs past its
chip's right edge or past the panel's right edge on any read, and at least one game chip (the Tip badge) was seen.
Record the widest label seen, its width and its chip's width, and one screenshot of the widest moment.

## K0.6: the one-second wait, timed as a real question pays it (row P98-KB-TIME-BUDGET)

Still with the game running. Three times, with three different questions, run
`ssh deck@192.168.86.52 'python3 - --with-chat-before-search --app-id 2321470 --app-name "Deep Rock Galactic: Survivor" --question "<question>"' < C:\Users\still\Documents\BonsAI\scripts\kb\probe_deck_kb_retrieval.py`
(questions: "how do I deal with the praetorian", "which class is easiest to start with", "what does the run timer
change"). Record each run's search time and its printed verdict, and the models-kept-loaded reading from K0.0. The
budget is 1.0 second. **Verdict MEASURED** (the roadmap's entry decides what the drift means).

Then exit the game with `deck_exitGame`; confirm over SSH that its process is gone (`pgrep -fl -i "survivor\|drg"`
reads empty). Record `free -m`.

## K0.7: the fourth reading, nothing running (row P98-NOTES-BLOCK-04-READING-4)

Nothing running, Strategy mode. "In Hades, how do I beat the boss called the Bone Hydra" (a boss that does not exist;
in September three weapon notes attached). The same fields as K0.3. **MEASURED.**

## K0.8: "Update knowledge base" with a newer library installed (row P97-L9-KB-UPDATE)

Only if K0.0 found the seed folder's version **newer** than the published one (dates: 2026.10.22 is newer than
2026.10.17). If it is not newer, record COULD NOT RUN with both versions; the check moves to block K1 after the night's
first `build.ps1` deploy.

1. Settings → Data: switch the Developer tab on if it is off (note it for the handover).
2. Developer tab → walk to "Install seed knowledge base" (read focus; the hint under it may still say "not live yet",
   that is lane E's job) → A. Wait for the status to settle (up to 60 s). Read the settings keys `rag_corpus_version`
   (print it) and `rag_corpus_path` (print it) again and the library's file dates: the installed version must now be
   the seed's.
3. Ollama tab → the knowledge base rows → walk to "Update knowledge base" (read focus; it sits beside Remove) → A.
   Within 10 s read the row's status line and the plugin log (`grep -i "installed=.*newest=" ~/homebrew/logs/bonsAI/*.log | tail -2`).
4. **Pass when:** the line reads "You have <seed version>; the published library is <published version>. Nothing to
   do.", the status stays Installed, the library's file dates are unchanged from step 2, and the log names both
   versions with outcome `installed_newer`. Record the exact line.
5. **Leave the seed installed** for the rest of the night (block K1 needs a fresh seed anyway); block KR puts the
   maintainer's published library back to the place K0.0 recorded (Remove, then Download, picking the same place).

## K0.9: the hidden spoiler box on a game known only by name (row STRAT-SPOIL-NAME-01)

Only if Doom 64: Retribution (or Super Mario 64, Mario Kart 64 or Pikmin 2) is on the Recent Games row; otherwise
COULD NOT RUN, naming the games on the row. Unload the AI as in K0.2 step 1. Launch it, wait 30 s, reopen Quick Access,
read the Context line (the game's name). Strategy mode, masking on, streaming on (read Settings → Story spoilers and the
streaming switch; change nothing). Question: "how do I beat the mother demon" (names the boss). Read the answer every
250 ms from the Ask press: **pass when** any spoiler box the model draws renders as plain text from the first streamed
word, with no "Spoiler hidden until complete…" chip and no tap-to-show block at any read; then ask "what weapon works
best against the big guys" and confirm the first answer stays plain once it is history; then reopen the chat from the
chat slot list and confirm it is still plain. Exit the game; confirm the process is gone.

## K0.10: handover (`docs/planning/assets/98-handover-K0.md` in the scratch folder, then the session copies it)

The build on the Deck; when the keep-awake runs out; the settings backup path; the test chat's name; **the library's
state before K0 (version, place, file dates, the published version) and after (the seed installed or not)**; every
setting you changed (the Developer tab switch) and whether it is back; the games on the Recent Games row as you saw
them; the Deck's screen and tab as you leave it; anything that surprised you.
