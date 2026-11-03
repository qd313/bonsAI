# Plan 102, Deck block R0: the owed knowledge-base rows with prepared setups, and the baseline for the Undo fix

For a fresh `deck-driver` helper (Sonnet 5.5 medium) started from **a chat that has the rig's tools** (the session that
runs plan 102 lost them at go, so this block runs from a second chat; the maintainer opens it when the Deck is on and
says "Run plan 102 Deck block R0" with this file). The rules of the helper file apply in full. No deploy in this block:
the build on the Deck is whatever plan 100 left (its final build hash was `222279568b09`; read the hash, do not assume
it). Evidence files go to `C:\Users\still\Documents\bonsAI-workshop\test-evidence\plan102-<ROW>.json` (never
overwrite; `-try2` if the name exists), screenshots beside them with the same stem. **Save a screenshot of every look
this runbook names**; the maintainer judges them from the checks page. Every Deck command is exactly
`ssh deck@192.168.86.52 '<command>'`. Stop at once if the rig's lease is held by another chat, if focus moves without
your press, or if anything asks for a password. About nine checks; if your memory runs low, write the handover and
stop, naming the rows left. The driving chat commits nothing and writes its handover to
`C:\Users\still\Documents\bonsAI-workshop\planning\assets\102-handover-R0.md`.

**Questions** go in with the send-question script, never by pressing A on the question box:
`ssh deck@192.168.86.52 'python3 - --text "the exact question"' < scripts/deck_send_ask.py`, check it printed VERIFIED
with the whole sentence, then walk to Ask and press A there as its own step. A question with an apostrophe cannot
survive the quotes: reword it. Every question is worded once and never repeated word for word (the answer cache would
serve it back). Wait for the answer to finish (the reply row appears) before any read. **Before every question, read the
chat's name.** The test chat is the long one that starts with the Mantis Lords question (plan 100 used it as "test"; no
chat is literally named "test"); it is over 40 questions long, so an answer in it may take up to 3 minutes and may show
"Couldn't sum up the chat this time": record that as a sighting and carry on. Where a check says "a fresh chat", make a
new empty chat (New chat; if the Deck is at ten chats it asks which to delete: stop and record COULD NOT RUN rather than
deleting one) and switch back to the test chat afterwards.

**The log's attach line** for a question: read the plugin log over SSH right after the answer finishes
(`tail -n 60 ~/homebrew/logs/bonsAI/*.log`; if the folder differs, `ls ~/homebrew/logs/`), and copy the one line saying
which notes reached the model and which footer line was added. **The saved chat** lives in
`~/homebrew/settings/bonsAI/chats/`. Key names only from any settings file, except `rag_corpus_version`,
`rag_corpus_path`, `spoiler_tier` and `ask_mode`.

**The Deck as plan 100 left it (2026-10-26, its retry round):** the plugin open on the Ollama tab, six saved chats, the
mode chip on Speed, "Show Developer tab" off, "Save files to Desktop" off, the published library 2026.10.25 installed at
`/home/deck/.bonsai/rag` (`corpus.db` 3,145,728 bytes), the spoiler row on Default, no pinned test chips, the models
`nomic-embed-text:latest` and `gemma4:e2b-it-qat` present and unloaded, no game running, a settings backup at
`/home/deck/p100-settings-backup.tgz`. Doom 64: Retribution was not on Recent Games; the maintainer was asked to launch
it by hand once. **A focus read in this block always records whether the page has the window's focus** (the rig's focus
read carries it; the Undo check below is about exactly that).

## R0.0: setup (row P102-R0-SETUP, one file)

1. `deck_status`: the stop switch off, no other chat's lease. `deck_holdAwake` 480 min; `expiresAt` into the evidence.
2. Which screen is live (the Deck's own or an external one); the window size. Back up the settings folder:
   `tar czf /home/deck/p102-settings-backup.tgz -C /home/deck/homebrew/settings bonsAI` (key names only if you list it).
3. The build: `sha256sum ~/homebrew/plugins/bonsAI/dist/index.js | cut -c1-12`; write it into every evidence file of the
   block. Open the plugin (the first open may fail once).
4. The library: `rag_corpus_version`, `rag_corpus_path`, `ls -l <path>/` (expect 2026.10.25, 3,145,728 bytes). The seed
   folder's version: `python3 -c "import json;print(json.load(open('/home/deck/homebrew/settings/bonsAI/seed-knowledge-base/corpus-manifest.json'))['version'])"`.
5. The models: `curl -s 127.0.0.1:11434/api/tags` (names only) and `/api/ps` (what is loaded); `free -m`.
6. The mode chip: read it; set Strategy for this block (put Speed back at the end). `spoiler_tier` must read default;
   the parental lock off; "Show Developer tab" off; no game running (`pgrep -fl -i "survivor\|drg\|doom"` reads empty).
7. The saved chats: `ls ~/homebrew/settings/bonsAI/chats/` (names only, count); name the test chat in the handover.
8. Which games are on the Recent Games row (read the row); whether Doom 64: Retribution is there or already running.

## R0.1: the knowledge-base smoke pass, with Show details (row P102-R0-SMOKE)

Nothing running, Strategy, the test chat. Question: "In Hollow Knight, what is the best way to fight the Mantis Lords"
(the boss is named, so no cover is expected). **Pass when:** the answer finishes; a "From the notes" block appears naming
a Hollow Knight note; walk to Show details (read focus) → A → the notes chip names at least one note, screenshot
(`-details.png`); the log's attach line names the same note(s); no "No close match" line. B back out. Record the block's
title, the notes named in Show details and in the attach line, and that they agree.

## R0.2: a route step says what it needs, a prepared try (row P100-NEEDS-01-try3, plan 102 call 7)

**The step list is drawn only after a branch button is pressed** (a question typed fresh gets a branch menu, by
design). Strategy, nothing running, the test chat. Question 1: "In Hollow Knight how do I get from Dirtmouth to the
City of Tears" (a route that needs the City Crest and a way across the Crossroads, so its steps should need things).
When the answer finishes, read the branch buttons under it; walk to the one about the route or the way there (read
focus) → A. The follow-up answer draws the route's step list. Read every step's text in the saved chat. **Pass when** at
least one step carries a "Needs" line on screen (the panel draws a small "Needs" part under a step whose text ends with
". Needs: <thing>"); screenshot the list (`-steps.png`). If none does, a second try, in a fresh chat, differently
worded: "Hollow Knight: what do I need to reach Greenpath from the start of the game", the branch button, the list read
again. **Two tries with no "Needs" line is FAIL** (the maintainer's call 7 then drops the clause); record every step's
text in the evidence either way.

## R0.3: Hide more keeps a cover shut on a game with no story, a prepared try (row P100-HIDE-MORE-SCREEN-01-try2)

Brotato is on the screen side's no-story list (plan 100's Mario Kart 64 try drew no cover in four tries, so the game
changes). Nothing running, Strategy, a fresh chat.
1. Settings → Story spoilers → the "How much to hide" row → **Hide more** (read focus on the button, A); over SSH
   `spoiler_tier` must read `strict`. Back to Main.
2. Question 1: "In Brotato what is waiting at the end of a run and how do I survive it". Question 2 (after 1 finishes):
   "Brotato: how do I beat the big thing on the last wave". For each: read the answer on screen every 250 ms while it
   streams and for 10 s after (the page read tool): does a spoiler cover (a hidden block with a "show" control) appear,
   and does it **stay shut** on its own? Screenshot each answer (`-strict-1.png`, `-strict-2.png`); read the saved chat
   for a hidden block in the text.
3. Settings → the row → **Default** (`spoiler_tier` reads `default`). Question 3, a third wording: "what happens on
   the final wave of a Brotato run". Read the same way: under Default on a no-story game, a cover **opens by itself**.
4. **Pass when** a cover was drawn under Hide more and stayed shut, and the Default cover opened. **No cover drawn under
   either setting in all three questions is UNCLEAR with the note "proven by its tests only"** (the second game to draw
   none); do not try a third game. The row ends on Default: read `spoiler_tier` once more.

## R0.4: the route's steps and the D-pad, a second checklist in one chat (row P98-ROUTE-01-try3)

Plan 98's one sighting: in a chat that already had one checklist answer, a second checklist's steps could not be
reached and Down went to the tab bar. The code read on 2026-11-02 says every checklist in a chat shares one set of step
spots, so this is the setup to reproduce. Strategy, nothing running, a fresh chat.
1. Question A: "In Hollow Knight how do I get from Dirtmouth to the False Knight for the first time" → when it
   finishes, press the branch button about the route (read focus, A) → the first checklist is drawn. From the end of the
   answer, Down: read focus (expect step 1 of that list). A on step 1 (it shows the step). Up back into the answer text.
2. Question B (the same chat): "Hollow Knight: how do I reach Greenpath from the Crossroads" → the branch button about
   the route → the second checklist is drawn. Now, from the end of THIS answer, Down: **read focus: the ring must land on
   step 1 of the new list** (read the step's label), not the tab bar and not the older list. A on step 1; Down: step 2;
   Up twice back to the answer; Down again lands on step 1. Record every landing with the label read. Screenshot the
   screen with both answers in view if the panel shows both (`-two-lists.png`).
3. **Pass when** every Down from the second answer lands on the second list's own steps and nothing lands on the tab
   bar. A landing on the tab bar, on the older list, or a dead press is FAIL; record the exact press and where the ring
   went (and whether the page had the window's focus).

## R0.5: the Undo trap as it is today, the baseline for lane C (row P98-DEMOTE-01-game-try2)

Plan 98's measurement (`plan98-P98-DEMOTE-01-game.json`, 2026-10-24): with Deep Rock Galactic: Survivor running, a Down
walk from Undo ended with the ring on the notes block and Down dead, the page without the window's focus. Lane C fixes
it tonight; block R1 checks the fix as P102-UNDO-FOCUS-01. This row repeats the exact presses first, so the fix has a
before and an after.
1. **Unload the Deck's AI first:** read the loaded model's name from `/api/ps`, then
   `curl -s 127.0.0.1:11434/api/generate -d "{\"model\": \"<that name>\", \"keep_alive\": 0}"`, and confirm `/api/ps`
   is empty. Record `free -m`.
2. Launch Deep Rock Galactic: Survivor with `deck_launchGame` (go to the start of the Recent Games row first). Wait
   until its window has been in front for 30 seconds. Close and reopen Quick Access; the Context line must name the
   game. Never reload the plugin with the game running.
3. The test chat, Strategy. Question: "what is the way to handle the glyphid dreadnought when it charges me" (the
   boss's note attaches). When it finishes: walk to "Not really" (read focus) → A → walk to "Wrong tip" (read focus) →
   A → if "Which note was it?" appears, A on the first note. The line "Marked not helpful / Undo" shows and Undo holds
   the ring (read focus; screenshot `-marked.png`).
4. **The exact walk:** without pressing Undo, press Down three times, reading focus after each press, with the field
   that says whether the page has the window's focus. Record each landing (the stop's label), and whether any press
   moved nothing. Expected today: the ring reaches the notes block and a Down there moves nothing, the page without
   focus (that is the measurement; a dead press here is MEASURED, not a fail of the Deck).
5. If the panel is dead: close and reopen Quick Access (record that the question box emptied, if it did). Then once
   more: the same marks on a reworded question ("how do I survive the dreadnought's charge in Deep Rock Galactic
   Survivor"), **A on Undo** this time (read focus after it), then Down three times with the same reads.
6. `cat ~/homebrew/settings/bonsAI/rag_demote.json` (its content is not a secret): record what it holds; do not edit
   it. Then Undo any mark still standing (A on Undo), so the night's later checks start clean; record the file again.
7. Exit the game with `deck_exitGame`; confirm over SSH its process is gone; record `free -m`. **Verdict: MEASURED**,
   with the two walks' landings; the fix is judged in block R1.

## R0.6: the hidden spoiler box on a game known only by name (row STRAT-SPOIL-NAME-01)

Only if Doom 64: Retribution is on the Recent Games row and `deck_launchGame` recognises its tile, or the maintainer
has launched it by hand and it is running (read `pgrep -fl -i doom`). Otherwise **COULD NOT RUN**, the seventh time,
naming the games on the row and what the launch tool said. The row's own steps are in `docs/testing-manual.md` under
STRAT-SPOIL-NAME-01 (around line 579): run them as written there (Strategy, the game known only by its shortcut name,
a boss question that does not name the boss; the hidden box must appear and open with A). Unload the AI before any
launch, as in R0.5 step 1; exit the game afterwards and confirm.

## R0.7: the saved walks through the rating row, re-saved (row P102-R0-RESAVE-WALKS)

Plan 100 added one stop to the reply row ("Suggest as a tip"), so every saved walk that passes through the rating row
now meets one more stop. Nothing running, the test chat. `deck_replayChecks` every saved knowledge-base walk by name
(the saved walks live in the workshop's `checks/` folder; list them and name each in the evidence). A walk whose only
difference from its saved landings is the new stop is **re-saved from its own start state**, not failed; name each one
re-saved and each that differed in any other way (those are findings for the session, not fixes for you).

## R0.8: handover (`102-handover-R0.md`, written to the workshop's `planning/assets/` folder)

Before you release anything: the mode chip back to Speed; `spoiler_tier` default; no game running; the models as at
R0.0 (unload what you loaded); the keep-awake released only if the maintainer says the night is over (otherwise leave
it held and say until when). The handover carries: the build hash, the library's version and size, the test chat's
name, every row's verdict in one line with its evidence file, the Deck's state as left (which tab the plugin is on, the
saved chats' count, the backup's path), and anything that surprised you.
