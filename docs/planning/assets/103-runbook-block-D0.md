# Plan 103, Deck block D0: the owed rows, the faster way to run a check, and the measurements the screen lanes wait for

Two halves, each for a fresh `deck-driver` helper (Sonnet 5.5 medium): **D0a** first, then **D0b** with D0a's handover.
The rules of the helper file apply in full. No deploy in this block: the build on the Deck is the one plan 102 left
(its hash was `9bc29b3c0500`; read it, do not assume it). Evidence files go to
`C:\Users\still\Documents\bonsAI-workshop\test-evidence\plan103-<ROW>.json` (never overwrite; `-try2` if the name
exists), screenshots beside them with the same stem. **Save a screenshot of every look this runbook names.** Every Deck
command is exactly `ssh deck@192.168.86.52 '<command>'`. Stop at once if the rig's lease is held by another chat, if
focus moves without your press, or if anything asks for a password. If your memory runs low, write the handover and
stop, naming the rows left. You commit nothing; your handover goes to
`C:\Users\still\Documents\bonsAI-workshop\planning\assets\103-handover-D0a.md` (or `-D0b.md`).

**What the maintainer allowed for this plan (decision D140, call 6), and nothing beyond it:** deleting saved chats that
earlier test drivers made, never one of the maintainer's own; placing test pictures in the Deck's screenshot folder,
each one written into your handover's put-back list; pulling one picture model (not in this block). If Claude Code's
own permission check refuses a step, record COULD NOT RUN for that row and go on; never look for another way round.

**Asking a question.** Row D0a.2 finds the fastest way that works on this Deck; from then on use it. Until then, the
old way: `ssh deck@192.168.86.52 'python3 - --text "the exact question"' < scripts/deck_send_ask.py`, check it printed
VERIFIED with the whole sentence, then walk to Ask and press A there as its own step (the question row reads chip,
Voice input, Clear, Ask from left to right; never A on Clear, never A on the question box). A question with an
apostrophe cannot survive the quotes: reword it. **Every question is worded once and never repeated word for word.**
Before every question, read the chat's name. Wait for the answer to finish before any read.

**Reading a result.** One small page read, not a walk: the newest answer's notes line (the element whose class starts
`bonsai-kb-notes-block`: its header text, and the note names if it is open), the spoiler covers in that answer (class
stem `bonsai-spoiler`: how many, how many open), whether a "No close match" or "Not in my notes" line is there, the
focused control's label, and `document.hasFocus()` on the panel's page. **The log's attach line:** right after the
answer finishes, `tail -n 60 ~/homebrew/logs/bonsAI/*.log` (if the folder differs, `ls ~/homebrew/logs/`), and copy the
one line saying which notes reached the AI and which footer line was added. **The saved chats** are in
`~/homebrew/settings/bonsAI/chat_slots/`. Key names only from any settings file, except `rag_corpus_version`,
`rag_corpus_path`, `spoiler_tier`, `ask_mode` and `media_library_access`.

**Presses.** One press call at a time; wait for it to land. Keep `deadlineMs` under two minutes on any press call. Pass
the row's name as `rowId` on every tool call so the run's ledger files it. A walk's or a launch's files go to your
scratch folder (`outDir`), never into the repo.

**The Deck as plan 102 left it (2026-11-03, about 21:10 EST):** the plugin open on the Main tab; the mode chip on
Speed; "Show Developer tab" off; "Use local knowledge base" on; the spoiler row on Default; no pinned test chips; the
published library 2026.10.25 at `/home/deck/.bonsai/rag` (`corpus.db` 3,145,728 bytes); the seed folder holding library
2026.11.04; `nomic-embed-text` and `gemma4:e2b-it-qat` present and unloaded; no game running; **ten saved chats (the
cap)**, one of them the long test chat that starts "In Hollow Knight, how do I beat the Mantis Lords" (over forty
questions); a settings backup at `/home/deck/p102-settings-backup.tgz`. Read on 2026-11-09 from the PC: the Deck
answers, nothing is running, Home is showing, and the Recent Games row holds God of War, Left 4 Dead 2, Deep Rock
Galactic: Survivor, Hades, Brotato, Grand Theft Auto V, Fallout 4, Control, Call of Juarez Gunslinger, Black Mesa,
Half-Life 2, Hollow Knight, Sifu, one more Steam title, Stardew Valley and Grand Theft Auto: San Andreas. Doom 64:
Retribution is installed as a non-Steam shortcut and is **not** on that row.

**Unloading the Deck's AI before a game:** `curl -s 127.0.0.1:11434/api/ps` (names only); for each model listed,
`curl -s 127.0.0.1:11434/api/generate -d "{\"model\":\"<name>\",\"keep_alive\":0}"`; read `/api/ps` again until it is
empty; `free -m` into the evidence. **Never reload the plugin with a game starting or running.** With a game up, close
and reopen Quick Access instead.

---

# D0a

## D0a.0: setup (row P103-D0-SETUP, one file)

1. `deck_status`: the stop switch armed, no other chat's lease. `deck_holdAwake` for 150 minutes; `expiresAt` into the
   evidence. You release it at the end of your half (D0a.7).
2. Which screen is live (the Deck's own or an external one); the window size. Back up the settings folder:
   `tar czf /home/deck/p103-settings-backup.tgz -C /home/deck/homebrew/settings bonsAI`.
3. The build: `sha256sum ~/homebrew/plugins/bonsAI/dist/index.js | cut -c1-12`; write it into every evidence file of
   the block. Open the plugin (the first open after a reload may fail once).
4. The library: `rag_corpus_version`, `rag_corpus_path`, `ls -l <path>/`. The seed folder's version:
   `python3 -c "import json;print(json.load(open('/home/deck/homebrew/settings/bonsAI/seed-knowledge-base/corpus-manifest.json'))['version'])"`.
5. The models: `curl -s 127.0.0.1:11434/api/tags` (names only) and `/api/ps`; `free -m`.
6. The mode chip: read it; set Strategy for this block (put it back at the end). `spoiler_tier` must read default; the
   parental lock off; "Show Developer tab" off; `media_library_access` read (not changed yet); no game running.
7. If Home shows Steam's suspend overlay (a dimmed "suspending" screen that buttons do not clear): release the hold,
   `deck_sleepAndWake` for 60 seconds, take the hold again, and say so in the evidence.

## D0a.1: clear the old test chats, start a clean one (row P103-D0-CHATS)

List the saved chats: for each file in `chat_slots`, the chat's first question only (no answers, no other text).
**A chat is a test chat only if its first question appears, word for word, in a runbook under
`docs/planning/assets/` (the files named `98-`, `100-` or `102-runbook-block-*.md`) or as the question of an evidence
file named `plan98-`, `plan100-` or `plan102-*.json` in the workshop's `test-evidence` folder.** Search for each first
question; write the match (file name) beside it in the evidence. Delete, through the plugin's own Delete chat box, each
chat that matched, **except the long Mantis Lords chat, which block D0b needs** (block DR deletes it at the end). A chat
with no match is the maintainer's: leave it, and say how many were left. Then start one new chat with a first question
of your own wording about Hollow Knight (not one from any runbook); that chat is this plan's test chat, and its first
question goes in your handover. **Pass when** the count is below ten and the new test chat exists.

## D0a.2: the faster way to run one check (row P103-D0-FLOW)

In the new test chat, Strategy, nothing running. **The new way:** with the ring on the question box, one
`deck_typeText` call with the question and `submit: true`; then one `deck_waitFor` until the newest answer has finished
(the reply row under it is drawn); then the one small page read described at the top; then the log's attach line. Note
the wall-clock time from the first call to the last, the number of tool calls, and the seconds the answer itself took.
If `submit` does not send the question, try `deck_typeText` without it, then the walk to Ask and A; say which worked.
**The old way,** for a second question: the send-question script, the walk to Ask, A, wait, the same reads; the same
three numbers. Questions (worded here once; do not reuse them): "Hollow Knight: what do charms do and how many can I
wear" and "In Hollow Knight, where do I find the first nail upgrade". **The row passes when** the new way sent a
question and read its result back at least once; the evidence names the way to use for the rest of this plan, with
both sets of numbers.

## D0a.3: the knowledge-base smoke pass (row P103-D0-SMOKE)

Nothing running, Strategy, the test chat. Question: "Hollow Knight: how should I handle the three Mantis Lords at
once" (the boss is named, so no cover is expected). **Pass when:** the answer finishes; a notes line appears naming a
Hollow Knight note; walk to Show details (read focus), A: the notes chip names at least one note, screenshot
(`-details.png`); the log's attach line names the same note or notes; no "No close match" line. B back out.

## D0a.4: opening the plugin right after a reload (row P89-RIG-OPEN-AFTER-RELOAD; evidence `plan103-P89-RIG-OPEN-AFTER-RELOAD.json`)

Two open roadmap bugs are about this, and the Deck tools were changed for it on 2026-11-02. **Nothing running**
(confirm with `pgrep` before each round). Three rounds: `deck_reloadPlugin`; at once `deck_openPlugin`; then one page
read: is the plugin's own panel on the page (an element with class `bonsai-scope`)? Also note, per round, how many
seconds the Decky tab was missing from the Quick Access rail, if it was. **Pass when** the first open call opened the
plugin in 3 of 3 rounds. A round where the tool said "open" and the read found no panel is a fail.

## D0a.5: the hidden spoiler box on a game known only by its name (row STRAT-SPOIL-NAME-01)

Blocked seven times because the rig could not launch a non-Steam shortcut. Unload the AI. `deck_launchGame` with
`title: "Doom 64: Retribution"` (it is installed and not on the Recent row, so the tool may need the Library grid; give
it one retry). If it does not start in two tries: **COULD NOT RUN**, with the tool's own words, and go on. If it
starts: 30 seconds with its window in front; close and reopen Quick Access; the Context line names the game. Then the
row's own steps, in `docs/testing-manual.md` under STRAT-SPOIL-NAME-01, run as written there (Strategy; a boss question
that does not name the boss; the hidden box must appear and open with A). Exit the game with `deck_exitGame`; confirm
with `pgrep -fl -i doom` that nothing is left.

## D0a.6: Undo, then Down, with the page out of focus (row P102-UNDO-FOCUS-01; evidence `plan103-P102-UNDO-FOCUS-01-try2.json`)

The fix from plan 102 is on this build; the Deck has not yet shown it working, because the page never lost the window's
focus on the night.
1. Unload the AI. `deck_launchGame` Deep Rock Galactic: Survivor (it is on the Recent row); 30 seconds in front; close
   and reopen Quick Access; the Context line names the game.
2. The test chat, Strategy. A boss question whose answer attaches a note: "In Deep Rock Galactic Survivor, what beats
   the dreadnought when it starts charging" (worded once). **Open Show details and leave it open.**
3. Walk to Not really, A; Wrong tip, A; the note (if "Which note was it?" shows), A. "Marked not helpful / Undo" shows
   with Undo holding the ring (read focus).
4. **Before any further press, read the page's focus:** `document.hasFocus()` must read false. If it reads true, close
   and reopen Quick Access and read again, up to six times. If it never reads false: record **NOT REPRODUCIBLE, second
   night**, not a pass, and skip step 5 (the session then moves the row to the maintainer's list as proven by its
   tests only).
5. Down four times, the ring and the page's focus read after each press. **The row passes only if the fourth press
   moves the ring to a new stop.** Write where each press landed. (Landing on the suggestion chips, past the open
   details panel, is the known open bug that lane F1 fixes later; it is still a pass for this row, said plainly.)
6. Undo the mark if it is still set (the "Lowered notes" row in the Ollama tab clears it if not). Exit the game;
   confirm.

## D0a.7: a picture question names the running game (row P102-PICTURE-01; evidence `plan103-P102-PICTURE-01-try2.json`), then the handover

Steam + R1 through the rig saved no picture twice, so place one. `media_library_access` must be on for the attach
screen to list pictures: if it reads off, record that, turn it on through the plugin's Permissions screen, and put it
back at the end.
1. Find Steam's screenshot folder for God of War (app id 1593500):
   `ls -d ~/.local/share/Steam/userdata/*/760/remote/1593500/screenshots 2>/dev/null`. If none exists, make that one
   folder under the same `userdata/<id>/760/remote/` path that other games' folders use, and say so.
2. From this PC, copy one God of War play picture from `C:\Users\still\Documents\bonsAI-workshop\screenshots\plan98\`
   into that folder as `plan103-test-gow-1.png` (`scp <file> deck@192.168.86.52:<folder>/plan103-test-gow-1.png`).
   **Write the full path into your handover's put-back list at once.**
3. Unload the AI. `deck_launchGame` God of War; 30 seconds in front; open the plugin; the paperclip in the question
   strip (read focus on it), A; the list must show the placed picture first: pick it. If the list does not show it,
   record that (it tells the session the attach screen needs more than a file) and stop this row as COULD NOT RUN.
4. "Which game is this picture from, and where am I in it" (the attachment stays). **Pass when** the reply names God of
   War; then a second try, attaching again, worded "What am I looking at here and what game is it". Two of two.
5. Exit the game; confirm.

**Then the handover (`103-handover-D0a.md`):** the mode chip back to what you found; `spoiler_tier` default; no game
running; the models unloaded; `media_library_access` as found; **the keep-awake hold released**. It carries: the build
hash; the library's version and size; the test chat's first question; **the way to ask a question that worked in
D0a.2**; every row's verdict in one line with its evidence file; the put-back list (each placed picture's full path;
the settings backup's path); the saved chats' count; anything that surprised you.

---

# D0b (a fresh driver, with D0a's handover)

Start as D0a.0, steps 1, 3 and 6 (hold the Deck awake for 150 minutes; read the build; Strategy), and release the hold
at the end. These rows are measurements: each records what is there today. None of them can "fail"; a reading that
could not be taken is COULD NOT RUN with the reason.

## D0b.1: does a covered answer's notes line come back when the cover is opened (row P103-M-COVERED-NOTES)

Nothing running, Strategy, the test chat. Read `plan102-P102-THIN-GAMES-01.json` in the workshop's evidence folder for
the Grand Theft Auto IV question that came back as one whole spoiler cover, and ask it in your own words. If the answer
is not one whole cover, try once more with the same file's other covered question, reworded. With a whole-cover
answer on screen: the page read (is a notes line drawn? expected: no); then walk to the cover, A to open it; the page
read again (is the notes line drawn now, and what does it name?); a screenshot of each state; the log's attach line.
Record both reads exactly.

## D0b.2: a no-story game named in the question (row P103-M-BROTATO)

Nothing running, the spoiler row on Default, "Open after consent" as you find it (read it, do not change it). Question:
"Brotato: what is the trick to the boss at wave twenty". Record: is a cover drawn; is it open or shut when the answer
finishes; a screenshot; the saved chat's last 400 characters; and from the plugin log every line for this turn that
names a game, a spoiler profile or a "low narrative" or "no story" decision (copy them; if there are none, say so).

## D0b.3: the Copy icon and a checklist (row P103-M-CHECKLIST)

Nothing running, Strategy, the test chat. "In Hollow Knight, how do I get from Dirtmouth down to the City of Tears";
when the answer finishes, read the choice buttons under it; walk to the one about the route, A. The follow-up answer
draws the step list. Record whether choice buttons are still on screen with the list. Then, three times each, reading
the ring and the page's focus after every press: ring on step 1, **Up** (where does it land?); ring on the Copy icon
(the icon in the answer's corner), **Down** (where does it land?); and once, Down from the answer's last paragraph.

## D0b.4: the "This answer / Session" strip in Show details (row P103-M-DETAILS-STRIP)

The strip is drawn only under a chat's newest answer. Two fresh chats: one of four questions, one of eight (short
Speed-mode questions about Hollow Knight, each worded differently; put Strategy back afterwards). In each chat, on the
newest answer: walk to Show details, A (it now reads "Hide details"). Then, three tries (walk back to "Hide details"
between tries): read `document.hasFocus()`; read the strip's own element (its `tabindex`, whether it is on screen);
press **Down** once; read where the ring landed. Then press Right once if the ring is on the strip (does it reach
"Session"?). Repeat the three tries in the eight-question chat with Deep Rock Galactic: Survivor running (unload the AI
first; launch; close and reopen Quick Access; exit the game afterwards and confirm). Delete the two chats you made
when the row is done.

## D0b.5: the summing-up in a long chat (row P103-M-SUMUP)

Nothing running, Strategy, **the long Mantis Lords chat**. One question: "Hollow Knight: is the Dream Nail worth
getting early". Record: whether "Couldn't sum up the chat this time" shows; the seconds from send to the first word of
the answer; and from the plugin log every line about the chat summary for this turn (how long it took, "failed in", any
error text). Switch back to the test chat afterwards.

## D0b.6: the tab sections and the ring (row P103-M-TAB-SECTIONS)

The Settings tab, nothing running. Read which sections exist and which are open. Open three sections (name them). Then
twelve Down presses and eight Up presses, one at a time, reading after each: the focused control's label, whether it is
on screen, and the page's focus. Mark any press after which the ring did not move, and any press that changed a setting
(read it back and put it back at once). Then try to put the ring on "Terse mode" by walking to it; record whether it
can take the ring and from which neighbour. Fold the sections back as you found them.

## D0b.7: the handover (`103-handover-D0b.md`)

As D0a's: the state put back (the mode chip, the sections, no game, the models unloaded, the hold released), every row
in one line with its evidence file, the two chats you made deleted, and for the session three plain sentences: what
decides whether the strip can be reached; where Up from step 1 goes; what the summing-up's log said.
