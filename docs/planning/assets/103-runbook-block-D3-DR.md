# Plan 103, Deck blocks D3 and DR: the new notes on the final library, then the Deck put back

Two blocks, each for a fresh `deck-driver` helper (Sonnet 5.5 medium): **D3** first, then **DR** with D3's handover.
The rules of the helper file apply in full, and so does **everything above the line "# D0a" in
`docs/planning/assets/103-runbook-block-D0.md`** (evidence names, the one way to write a Deck command, what the
maintainer allowed, reading a result, presses, unloading the AI): read that part first. Evidence goes to
`C:\Users\still\Documents\bonsAI-workshop\test-evidence\plan103-<ROW>.json`, screenshots beside it. Handovers go to
`C:\Users\still\Documents\bonsAI-workshop\planning\assets\103-handover-D3.md` and `-DR.md`. You commit nothing and you
do not deploy: the session deployed before starting you and gives you the build hash in your task.

**Safety rules (the Deck froze on 2026-11-09 when a picture question over a heavy game used all its memory):**
1. No picture question. No game heavier than Deep Rock Galactic: Survivor. Never God of War.
2. Before every question and every game launch: `free -m`. If "available" is under 3,000 MB, skip the step and say so.
3. No question while a game is running. Unload the AI before a launch; exit the game before the next question.
4. Two timeouts in a row on any Deck read or press: stop at once, write the handover, report.
5. Never reload the plugin with a game running.

**How to ask:** ring on the question box, one `deck_typeText` with `clear: true, submit: true`, one `deck_waitFor` on
the reply row, then `python scripts/deck_kb_readback.py --json` from the shared checkout (the newest answer's notes
line, covers and the log's attach line). After an answer one Down puts the ring back on the question box. Every
question is worded once, in your own words, the way a player would type it, and never taken from an evidence file or
from a test file in the repo.

---

# D3 (a fresh driver)

## D3.0: setup (row P103-D3-SETUP)

1. `deck_status` (the stop switch armed, no other chat's lease). `deck_holdAwake` for 180 minutes.
2. The build: `sha256sum ~/homebrew/plugins/bonsAI/dist/index.js | cut -c1-12` must read the hash in your task. If it
   does not, stop and report. Open the plugin (the first open after a deploy may fail once).
3. `free -m`; no game (`pgrep -fl SteamLaunch`); `/api/ps` empty.
4. **The library must be the session's final one.** The seed folder's version:
   `python3 -c "import json;print(json.load(open('/home/deck/homebrew/settings/bonsAI/seed-knowledge-base/corpus-manifest.json'))['version'])"`
   and the installed one (`rag_corpus_version`). The deploy brought a new seed folder, so install it again even if an
   earlier block installed one: Settings, Data, "Show Developer tab" on (say how you found it); the Developer tab;
   walk to "Install seed knowledge base" (read the ring on it); A; wait up to 60 seconds; `rag_corpus_version` reads
   the seed's version; `ls -l <rag_corpus_path>/`. Write both versions and the file size into the row.
5. Start one new chat for this block (say its first question in the handover, so block DR can delete it). The mode
   chip on Strategy; `spoiler_tier` default.

## D3.1: one question per game finds a new note (row P103-NOTES-23-01)

Nothing running. One question per game below, each naming its game the way a player would, about an enemy, a boss or
an item (your choice of subject; do not look in the repo for one). After each: the read-back script; write the
question, the names and numbers of the notes that attached (from the log's attach line), and whether one of them has a
number in that game's range.

| Game (name it in the question) | A new note's number is in |
|---|---|
| Left 4 Dead 2 | 2200 to 2214 |
| Fallout 4 | 2300 to 2313 |
| Red Dead Redemption 2 | 2400 to 2413 |
| Cyberpunk 2077 | 2700 to 2714 |
| Mario Party (the first one) | 2800 to 2814 |
| Mario Party 2 | 2900 to 2914 |
| Mario Party 3 | 3000 to 3014 |
| Mario Party 6 | 3100 to 3114 |
| Mario Party 7 | 3200 to 3214 |
| Super Smash Bros. (the Nintendo 64 one) | 3300 to 3314 |
| Super Smash Bros. Melee | 3400 to 3414 |
| Grand Theft Auto III | 3500 to 3514 |
| Yoshi's Story | 3600 to 3614 |
| Diddy Kong Racing | 3700 to 3713 |
| Fallout: New Vegas | 3800 to 3813 |
| Brotato | 3900 to 3914 |
| Palworld | 4000 to 4013 |
| Skyrim | 4100 to 4113 |
| Hollow Knight | 4200 to 4214 |
| DOOM Eternal | 4400 to 4414 |

Three more games were on the plan's list and got no notes this session (Hades, Half-Life 2, Black Mesa): ask nothing
for them; the row names them as "not written", not as misses.

**A game passes** when a note in its range attached. A game whose question attached only older notes gets ONE more
question about a different subject; two misses is a miss. **The row passes on 18 of 20 or more;** name every miss
with what attached instead. For any three of the twenty, also copy the first two sentences of the answer, so the
maintainer can see the note being used. If your memory runs low, stop after a whole game, write the handover with the
games left, and say so: a second driver finishes the list.

## D3.2: versus questions find the versus notes (row P103-VERSUS-01)

Nothing running. Three Left 4 Dead 2 questions that say "versus" (or "playing as the infected"), your own words: one
about how scoring or spawning works in versus, one about playing a special infected well, one about a survivor team
answering combined attacks. **Pass when** at least two of the three attach a note numbered 4500 to 4514 or one of the
"Playing as the ..." notes. Then one question about where to ambush survivors on a campaign's LAST map (a finale),
your own words: record what attached and whether the answer volunteers a finale's events. The notes leave finales out
on purpose, so no versus note for that map is expected; an answer that describes how a campaign ends is a finding for
the session (copy its first three sentences), not a fail of this row.

## D3.3: the chips follow the last question (row P103-CHIP-ORDER-01), only if your task says the chip order landed

If your task does not say it landed, write "not built this session" and go on. Otherwise, for two games (Hollow Knight
and one of the table's Steam games): a boss question naming the game; when the answer finishes, read the suggestion
chips' words, in order. **Pass when,** for each game, at least one of the first three chips names something from the
same fight or area, and at least one of the game's own chips shows. Screenshot each chip row.

## D3.4: the saved walks, re-saved on this build (row P103-D3-RESAVE-WALKS)

The answer screen has new D-pad stops (the "This answer / Session" strip, the chips under it, and the step list after
the Copy icon), so a walk saved before today may meet one more stop. Nothing running, a chat with an answer on screen.
Replay the saved knowledge-base walks **by name, one at a time** (`deck_replayChecks`; read its description first; never
a replay of everything). A walk whose only difference from its saved landings is one of those new stops is re-saved
from its own start state, not failed; name each one re-saved and each that differed in any other way (those are
findings for the session, not fixes for you). Stop this row after 30 minutes whatever is left, and list what is left.

## D3.5: handover (`103-handover-D3.md`)

No game; the AI unloaded; the hold released; "Show Developer tab" left ON for block DR (say so). The handover: the
build hash; the installed library's version; the row's count out of 20 with every miss named; the versus row; the
chips row or "not built"; the walks re-saved; the first question of the chat you made; anything that surprised you;
the Deck's state as you leave it.

---

# DR (a fresh driver, with D3's handover): the smoke pass, then everything put back

**What this session changed on the Deck, all of it** (from the drivers' handovers; read D1's, D2's and D3's handovers
first and add anything they name that is not here):
- the installed library is the session's own, not the published one (the published one was 2026.10.25, `corpus.db`
  3,145,728 bytes at `/home/deck/.bonsai/rag`);
- the mode chip is on Strategy (found on Speed);
- "Show Developer tab" may be on (found off);
- saved chats the drivers made: the short test chat (first question "Hollow Knight: which areas should I explore
  first after Greenpath") and block D3's chat; the long chat that starts "In Hollow Knight, how do I beat the Mantis
  Lords" was made by earlier test drivers and has grown by a few test questions;
- a settings backup at `/home/deck/p103-settings-backup.tgz`, and, if block D1 made one, a copy of the published
  library's folder at `/home/deck/p103-rag-published-backup`;
- an empty folder the first driver made for a test picture
  (`/home/deck/.local/share/Steam/userdata/23333482/760/remote/1593500/screenshots/`); the picture itself was removed
  on 2026-11-09;
- no picture model was pulled.

## DR.0: setup and the smoke pass (rows P103-DR-SETUP, P103-DR-SMOKE)

`deck_status`; `deck_holdAwake` for 90 minutes; the build hash against your task; `free -m`; no game; `/api/ps` empty.
Then one Hollow Knight question naming a boss, in D3's chat: the answer finishes and a notes line names a Hollow
Knight note.

## DR.1: the published library back (row P103-DR-LIBRARY)

1. **Before removing anything,** read whether internet downloads are on (the switch on the Settings tab, by its
   on-screen state). If they are off, do NOT press Remove: turning a download switch on is the maintainer's call.
   Record COULD NOT RUN, say that the session's library is still installed, and go to DR.2.
2. The knowledge-base section: Remove (read the ring on it, then A; confirm in its box); then Download (read the ring,
   A; its box may name the size; confirm); wait for it to finish (up to three minutes).
3. Read back `rag_corpus_version` and `ls -l <rag_corpus_path>/`. **Pass when** the version is the published one
   (2026.10.25, or a newer published version if the maintainer has published since; say which) and a Hollow Knight
   question still attaches a note.
4. If the download fails twice: copy the backup back if block D1 made one
   (`rm -rf /home/deck/.bonsai/rag && cp -a /home/deck/p103-rag-published-backup /home/deck/.bonsai/rag` is NOT yours
   to run on your own judgment: stop, say what the screen shows, and report; the session decides).

## DR.2: the chats (row P103-DR-CHATS)

Delete, through the plugin's own Delete chat control (title row, Right to "Delete chat", A, then in Steam's box Left
to "Delete", A): block D3's chat, any chat block D1 or D2 left that their handovers name, and the long Mantis Lords
chat. **Never** the maintainer's three (their first questions are about the Soul Master, about exploders, and about
the best first weapon) and never a chat you cannot match to a driver's handover. Leave the short test chat as the
open one. Write the list of chats left, by first question.

## DR.3: the settings, key by key (row P103-DR-SETTINGS)

1. The mode chip back to **Speed** (read it after). The spoiler row on Default. "Read game & screenshot context" off.
   "Show Developer tab" **off**.
2. Compare today's settings file with the backup, printing **key names only, never a value** (the file holds a
   secret): unpack `/home/deck/p103-settings-backup.tgz` into a scratch folder under `/tmp`, and print the names of the
   keys whose values differ and the names of keys present in only one of the two. Expected to differ: the library's
   version and path keys only if DR.1 could not run, and keys that change with use (last-used times, chat ids,
   counters). Every other differing key: name it in the row; set it back through the plugin's own screen when it is
   one of the switches this runbook names; anything else is reported, not changed. Remove the scratch folder.
3. No pinned test chips (the suggestion row shows the everyday chips).

## DR.4: nothing left behind (row P103-DR-RESTORE)

- `ollama list` names (names only): the same models as before the plan (`nomic-embed-text`, `gemma4:e2b-it-qat`, and
  whatever else the first handover listed); nothing pulled.
- The test-picture folder is empty (`ls -la` on the path above). Leave the empty folder.
- `/home/deck/p103-rag-published-backup`: remove it only if DR.1 passed (`rm -rf` on exactly that path). Leave
  `/home/deck/p103-settings-backup.tgz` in place and say so (it is 2026-11-09's state; the maintainer may want it).
- No game running; the AI unloaded; the plugin on the Main tab; Quick Access closed; the hold released
  (`deck_restorePowerSettings` if the block changed any).
- A last `deck_status`.

## DR.5: handover (`103-handover-DR.md`)

Each put-back in one line: done, or not done and why. The library's version. The chats left. The key names that still
differ from the backup. Anything on the Deck that is not as the maintainer left it on 2026-11-09, said plainly.
