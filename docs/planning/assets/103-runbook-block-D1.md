# Plan 103, Deck block D1: one check per item that landed in wave A, on deploy 1

For one fresh `deck-driver` helper (Sonnet 5.5 medium). The rules of the helper file apply in full, and so does
**everything above the line "# D0a" in `docs/planning/assets/103-runbook-block-D0.md`** (evidence names, the one way to
write a Deck command, what the maintainer allowed, reading a result, presses, unloading the AI): read that part first.
Evidence goes to `C:\Users\still\Documents\bonsAI-workshop\test-evidence\plan103-<ROW>.json`, screenshots beside it.
Your handover goes to `C:\Users\still\Documents\bonsAI-workshop\planning\assets\103-handover-D1.md`. You commit nothing
and you do not deploy: the session deployed before starting you and gives you the build hash in your task.

**Safety rules added after the Deck froze on 2026-11-09 (a picture question over a heavy game used all its memory):**
1. No picture question in this block. No game heavier than Deep Rock Galactic: Survivor. Never God of War.
2. Before every question and every game launch: `free -m`. If "available" is under 3,000 MB, skip the step and say so.
3. No question while a game is running. Unload the AI before a launch; exit the game before the next question.
4. Two timeouts in a row on any Deck read or press: stop at once, write the handover, report.
5. Never reload the plugin with a game running.

**How to ask (block D0's finding):** ring on the question box, one `deck_typeText` with `clear: true, submit: true`,
one `deck_waitFor` on the reply row, then `python scripts/deck_kb_readback.py --json` from the shared checkout (it
prints the newest answer's notes line, covers and the log's attach line), plus one small page read when a row needs
more. After an answer the ring is unowned; one Down puts it back on the question box. `deck_runSequence` is cheaper
than `deck_walkTo` for a few presses. Every question is worded once, in your own words unless the row gives the words,
and never taken from an earlier evidence file.

**The Deck as block D0b left it (2026-11-09, 21:42 EST), before the deploy:** the plugin on the Main tab in the test
chat (first question "Hollow Knight: which areas should I explore first after Greenpath"); the mode chip on Strategy;
no game; the AI unloaded; five saved chats (the test chat, the long chat that starts "In Hollow Knight, how do I beat
the Mantis Lords", and three of the maintainer's that nobody touches); the published library 2026.10.25 installed;
"Read game & screenshot context" off; "Show Developer tab" off; a settings backup at
`/home/deck/p103-settings-backup.tgz` (leave it; do not overwrite it).

---

## D1.0: setup, and install the session's library (row P103-D1-SETUP)

1. `deck_status` (the stop switch armed, no other chat's lease). `deck_holdAwake` for 150 minutes.
2. The build: `sha256sum ~/homebrew/plugins/bonsAI/dist/index.js | cut -c1-12` must read the hash in your task. If it
   does not, stop and report. Open the plugin (the first open after a deploy may fail once).
3. `free -m`; no game (`pgrep -fl SteamLaunch`); `/api/ps` empty.
4. The library: read `rag_corpus_version`. The seed folder's version:
   `python3 -c "import json;print(json.load(open('/home/deck/homebrew/settings/bonsAI/seed-knowledge-base/corpus-manifest.json'))['version'])"`.
   **Install the session's library:** Settings, Data, "Show Developer tab" on (found off; you put it back at the end);
   the Developer tab; walk to "Install seed knowledge base" (read the ring on it); A; wait up to 60 seconds;
   `rag_corpus_version` now reads the seed's version; `ls -l <rag_corpus_path>/`. Block DR puts the published library
   back at the end of the plan; say in the handover that it is owed.
5. The mode chip reads Strategy (leave it); `spoiler_tier` default; the test chat's name read.

## D1.1: smoke (row P103-D1-SMOKE)

Nothing running, the test chat. One Hollow Knight question naming a boss the library has a note for (not a wording
from block D0). **Pass when** the answer finishes, a notes line names a Hollow Knight note, the log's attach line
agrees, and the reply does not open with a sentence saying the notes do not cover the question (that feature is
switched off in this build).

## D1.2: a fully covered answer says notes were used (row P103-COVERED-NOTES-01)

Block D0b found, on the old build, that a fully covered answer showed no notes line at all, before or after opening.
Nothing running, Strategy, spoiler row on Default. Ask a late-game question that draws one cover over the whole
answer: a question about beating Doopliss in Paper Mario: The Thousand-Year Door did so in D0b (use your own words).
If the cover is only partial, try one more differently worded late-boss question from a story game the library covers.
**Pass when,** with the cover shut, a caption under the answer reads "Notes were used for this answer — show the
spoiler to see them" (copy the words you see), and after A on the cover the notes line itself shows with the note's
name. Screenshots: `-shut.png`, `-open.png`. A shut cover with no caption is a FAIL. Record also what a partial cover
shows, if you met one.

## D1.3: opening one cover leaves the other answer covered (row P103-COVER-PER-TURN-01)

In the same chat, a second differently worded question that draws a whole cover. Then open the cover of ONE of the two
answers. **Pass when** the other answer still shows only its shut cover and its caption (no notes line). Screenshot
with both answers' state readable (two shots if they do not fit one screen).

## D1.4: a Brotato question does not hide its answer (row P103-BROTATO-01)

Brotato has no story. Block D0b found a Brotato answer wholly behind a shut cover on Default. Nothing running, Default.
Two questions that name Brotato, differently worded, each about something late in a run (a late wave, the last boss of
a run). **Pass when,** for each, either no cover is drawn or the cover is already open when the answer finishes, and
the notes line shows if notes were attached. A shut cover on either is a FAIL; copy the log line that names the
spoiler decision for the turn if there is one. Screenshot each.

## D1.5: the log stays quiet with the mic off (row P103-MIC-LOG-01)

The mic is not used in this row. Note the time on the Deck (`date +%H:%M:%S`). On the Main tab: close Quick Access and
open it again with the plugin's panel showing, six times, about three seconds apart (the stray log line came from the
screen's clean-up when it goes away, not from a press). Then
`grep -c "stop pressed, no recording was running" ~/homebrew/logs/bonsAI/*.log` and the same grep limited to lines
after your noted time. **Pass when** no such line was written after the noted time.

## D1.6: the quick-start box leads with this Deck (row P103-QUICKSTART-01)

The About tab, "Using bonsAI" (the help box). Read its text with one page read and take a screenshot of each screenful
(`-1.png`, `-2.png`). **Pass when** the box opens by saying the AI can run on this Deck with the Install Ollama button
on the Ollama tab, and names the home PC as the second way. Copy the first two sentences into the evidence. The
maintainer judges the wording from the screenshots. B closes the box.

## D1.7: the summing-up in the long chat (row P103-SUMUP-01)

Open the long chat (first question "In Hollow Knight, how do I beat the Mantis Lords"). Note `date +%s` on the Deck,
then ask one new Hollow Knight question. Measure the seconds from sending to the first word of the answer on screen
(poll the page for the newest answer's first text; say how you measured), and to the answer finishing. Then: is a line
above the answer saying the chat could not be summed up, and what reason does it give (copy its words; screenshot
`-line.png` if present); every log line after your noted time that contains "chat summary" or "summar" (copy them);
the saved chat's summary date (the chat's file in `chat_slots`: key names and the summary's date and turn count only).
**Pass when** the chat was summed up (a fresh summary date, or a log line saying so) or the line on screen and the log
both say why not in plain words. A bare "Couldn't sum up the chat this time" with no reason and no log line is a FAIL.

## D1.8: a mod-setup question reaches a mod tip (row P103-MODS-TIPS-01)

Needs the session's library (D1.0 step 4). Nothing running, back in the test chat. Ask: "how do I set up mods for
Skyrim on my Deck". **Pass when** the log's attach line names a tip from the mod-basics topic (copy its name), and
the answer's notes or tips line shows it. Then one more, your own words, about a mod manager on the Deck for another
game; record what attached (not part of the verdict).

## D1.9: two of the new notes files answer (row P103-NOTES-EARLY-01; a first look, not the full row)

Needs the session's library. Nothing running, the test chat. Two questions, your own words, each naming its game:
one about dealing with a kind of uncommon infected in Left 4 Dead 2, one about what an item does in Mario Party 3.
**Pass when** each attaches a note whose number is in the new files' ranges (Left 4 Dead 2: 2200 to 2299; Mario Party
3: 3000 to 3099); the read-back script or the log's attach line gives the note. Name what attached either way.

## D1.10: the look check and the sweep (rows QA-LOOK-01-p103 and P103-D1-SWEEP)

Nothing running: the look check on Main with an answer and its notes line on screen, and on the About tab (nothing
pressed against the right edge, cut off or overlapping; screenshots `-main.png`, `-about.png`). Then the free-play
sweep on Main with nothing running. Then, only if `free -m` shows 3,000 MB or more available with the AI unloaded:
launch Deep Rock Galactic: Survivor, wait 40 seconds, the sweep again with no question asked, exit the game, confirm
with `pgrep`. No stop twice, no lost ring; record the stop counts.

## D1.11: handover (`103-handover-D1.md`)

"Show Developer tab" back off; the mode chip left on Strategy; no game; the AI unloaded; the hold released. The
handover: the build hash; the installed library's version and size (the published one is owed back in block DR); each
row's verdict in one line with its evidence file; the first-word seconds from D1.7; anything that surprised you; the
Deck's state as you leave it.
