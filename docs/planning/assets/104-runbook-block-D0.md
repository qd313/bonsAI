# Plan 104, Deck block D0: the owed rows, the memory readings, and the measurements the screen lanes wait for

Three parts, each for a fresh `deck-driver` helper (Sonnet 5.5 medium): **D0a**, then **D0b** with D0a's handover, then
**D0c** with D0b's. The rules of the helper file apply in full. The session deploys before D0a starts if the Deck's
build does not carry the crash fix of 11 November; your task says which build to expect. Evidence files go to
`C:\Users\still\Documents\bonsAI-workshop\test-evidence\plan104-<ROW>.json` (never overwrite; `-try2` if the name
exists), pictures beside them with the same stem. **Save a picture of every look this runbook names.** Every Deck
command is exactly `ssh deck@192.168.86.52 '<command>'`. Stop at once if the rig's lease is held by another chat, if
focus moves without your press, or if anything asks for a password. If your memory runs low, write the handover and
stop, naming the rows left. You commit nothing; your handover goes to
`C:\Users\still\Documents\bonsAI-workshop\planning\assets\104-handover-D0a.md` (or `-D0b.md`, `-D0c.md`).

**What the maintainer allowed for this plan (decision D141, call 3), and nothing beyond it:** installing the session's
library for a check and putting the published one back (not in this block); deleting saved chats that earlier test
drivers made, never one of the maintainer's own; placing test pictures in the Deck's screenshot folder, each one
written into your handover's put-back list; deleting the two old settings backups (row D0a.1). If Claude Code's own
permission check refuses a step, record COULD NOT RUN for that row and go on; never look for another way round.

**The freeze rules, every part of this block** (a question asked over God of War froze the Deck on 2026-11-09):

1. Before every question and every game launch: `free -m`, and write the "available" number into the evidence. Under
   3,000 MB: skip the step and say so.
2. **No question while a game is running**, except where a row below says so, and then only with a light game, the
   AI unloaded before the launch, and 4,000 MB or more available with the game up.
3. **Never a question, of any kind, with God of War or any other heavy game running.** This block launches God of War
   once, to read memory, and asks nothing.
4. Two timeouts in a row on any Deck read or press: stop at once, write the handover, report.
5. Never reload the plugin with a game starting or running. With a game up, close and reopen Quick Access instead.

**Unloading the Deck's AI before a game:** `curl -s 127.0.0.1:11434/api/ps` (names only); for each model listed,
`curl -s 127.0.0.1:11434/api/generate -d "{\"model\":\"<name>\",\"keep_alive\":0}"`; read `/api/ps` again until it is
empty; `free -m` into the evidence. **Is a game running:** `pgrep -f '[S]teamLaunch AppId'`.

**Asking a question** (the way that worked last wave): put the ring on the question box (after an answer nothing holds
the ring: one `deck_walkTo` DOWN places it; with a game up, UP from Ask); one `deck_typeText` with the question,
`clear: true`, `submit: true` (it sends Enter; **never press A on the question box**); one `deck_waitFor` until the
newest answer's "Was this helpful?" row is drawn, with `deadlineMs: 130000`; then the one-call read-back,
`ssh deck@192.168.86.52 'python3 - --json' < scripts/deck_kb_readback.py` (run from the shared checkout,
`C:\Users\still\Documents\BonsAI`), and the log's attach line: `tail -n 60 ~/homebrew/logs/bonsAI/*.log`, the line
containing "notes for this answer:". **Every question is worded once and never repeated word for word.** A question
with an apostrophe cannot survive the quotes: reword it. Before every question, read the chat's name.

**Keep the tools' replies small.** Typing, walks, opening the plugin and sweeps can each return tens of thousands of
characters, and that is what cut last wave's blocks short. Read the page with small expressions that return only the
fields the row names. Give every walk and launch an `outDir` in your scratch folder. If a reply was large, do not make
the same call again: use a narrower read. Pass the row's name as `rowId` on every tool call. Keep `deadlineMs` under
two minutes on any press call.

**The Deck as plan 103 left it (2026-11-10 and 11; read it, do not assume it):** a plugin build newer than
`1ad7ad9b4bf9`; the library the Deck last read back as 2026.10.25 (the published one is 2026.11.10 now, and the
maintainer may have updated the Deck since); the mode chip on Speed; "Show Developer tab" off; "Use local knowledge
base" on; the spoiler row on Default; no pinned test chips; four or five saved chats, one of them a long test chat of
about 66 questions; two settings backups in the home folder, `/home/deck/p102-settings-backup.tgz` and
`/home/deck/p103-settings-backup.tgz` (about 209 MB); no game running. The Recent Games row on 2026-11-09 held God of
War, Left 4 Dead 2, Deep Rock Galactic: Survivor, Hades, Brotato, Grand Theft Auto V, Fallout 4, Control, Call of
Juarez Gunslinger, Black Mesa, Half-Life 2, Hollow Knight, Sifu, Stardew Valley and Grand Theft Auto: San Andreas.
Doom 64: Retribution is a non-Steam shortcut; `deck_launchGame` takes it by `title`.

---

# D0a

## D0a.0: setup (row P104-D0-SETUP, one file)

1. From the shared checkout: `python scripts/deck_queue.py add "plan 104 block D0a, about 40 minutes" --by plan104`,
   then `python scripts/deck_queue.py next`. `deck_status` and `deck_listMachines`: the stop switch armed, no lease
   held by anyone else. If another chat's row is running in the queue or holds the lease: stop and report.
2. `deck_holdAwake` with `ttlMinutes: 480`; `expiresAt` into the evidence and the handover. **You do not release it at
   the end**: the hold stays for the whole session (D141, call 5) and each later part renews it.
3. Which screen is live (the Deck's own or an external one); the window size.
4. **This plan's own settings backup, before anything else changes:**
   `tar czf /home/deck/p104-settings-backup.tgz -C /home/deck/homebrew/settings bonsAI`, then `ls -l` on it.
5. The build: `sha256sum ~/homebrew/plugins/bonsAI/dist/index.js | cut -c1-12`, and
   `grep -c read_in_own_thread ~/homebrew/plugins/bonsAI/py_modules/backend/knowledge/knowledge_base_cards.py` (1 or
   more means the crash fix of 11 November is on the Deck). Write both into every evidence file of the block. If the
   count is 0, stop and tell the session: the deploy did not happen.
6. Open the plugin. The library: read `rag_corpus_version` and `rag_corpus_path` from the settings file (those two
   keys only; key names only for everything else), then `ls -l <path>/`.
7. The models: `curl -s 127.0.0.1:11434/api/tags` (names only) and `/api/ps`; `free -m`.
8. The mode chip: read it; set Strategy for this block and write the old value in the handover. `spoiler_tier` reads
   default; the parental lock off; "Show Developer tab" off; no game running.
9. If Home shows Steam's suspend overlay (a dimmed "suspending" screen that buttons do not clear): release the hold,
   `deck_sleepAndWake` for 60 seconds, take the hold again for 480 minutes, and say so in the evidence.

## D0a.1: the two old settings backups (row P104-D0-BACKUPS)

Only after D0a.0 step 4 has shown this plan's own backup exists.
`ls -l /home/deck/p102-settings-backup.tgz /home/deck/p103-settings-backup.tgz` into the evidence. Then
`rm /home/deck/p102-settings-backup.tgz /home/deck/p103-settings-backup.tgz`, and the same `ls` again.
**Pass when** both are gone and `/home/deck/p104-settings-backup.tgz` is still there. Delete nothing else: if a folder
`/home/deck/p103-rag-published-backup` exists, write that it does and leave it.

## D0a.2: the test chats (row P104-D0-CHATS)

List the saved chats (`~/homebrew/settings/bonsAI/chat_slots/`): for each file, the chat's first question only.
**A chat is a test chat only if its first question appears, word for word, in a runbook under `docs/planning/assets/`
(files named `98-`, `100-`, `102-` or `103-runbook-block-*.md`) or as the question of an evidence file named
`plan98-`, `plan100-`, `plan102-` or `plan103-*.json` in the workshop's `test-evidence` folder.** Write the match (the
file's name) beside each. **Keep the long test chat** (about 66 questions): D0a.4 and D0b need it; block DR deletes
it. Delete, through the plugin's own Delete chat box, any other chat that matched. A chat with no match is the
maintainer's: leave it and count it. Then start one new chat with a first question of your own wording about Hollow
Knight (not one from any runbook): that is this plan's test chat, and its first question goes in your handover.
**Pass when** the new test chat exists and the long test chat is still there.

## D0a.3: the knowledge-base smoke pass (row P104-D0-SMOKE)

Nothing running, Strategy, the test chat. One question about a named Hollow Knight boss, in your own words (the boss
is named, so no cover is expected). **Pass when:** the answer finishes; the read-back shows a notes line naming a
Hollow Knight note; the log's attach line names the same note; no "No close match" line. Note the seconds from send to
done and the number of tool calls you needed: row D0a.6 compares against them.

## D0a.4: the back end no longer crashes when several things read the library at once (row P104-KB-THREADS-01)

The row's own words are in `docs/testing.md` (search for P104-KB-THREADS-01): run it as written there. In short:
nothing running; `deck_reloadPlugin`; open the plugin; switch to the long test chat and step through a few of its
answers so their tap-to-define words and the chips load together; go to the Ollama tab and walk to the Install or
Update button (read the ring first), press A; **if a box opens, read its title and press B: never confirm a
download**. Then `journalctl -b | grep -i segfault` and `tail -n 200 ~/homebrew/logs/bonsAI/*.log | grep -a -i "misuse"`.
**Pass when:** the back end kept answering (the box opened, or the status line updated, inside fifteen seconds; a new
question in the test chat gets an answer), no segfault line newer than the reload, and no "bad parameter or other API
misuse" line. Switch back to the test chat before any question.

## D0a.5: free memory, read four ways (row P104-M-MEMORY; a measurement, no verdict but "measured")

No question is asked in steps 3 and 4. For each step write `free -m` (the "available" and the swap numbers),
`grep MemAvailable /proc/meminfo`, and `curl -s 127.0.0.1:11434/api/ps`.

1. **Idle:** nothing running, the AI unloaded.
2. **The AI loaded:** right after the smoke pass's answer or one new question in the test chat: `/api/ps` in full for
   this step only (each model's name, `size` and `size_vram`), and `curl -s 127.0.0.1:11434/api/tags` sizes for the
   same model.
3. **A light game:** unload the AI; `deck_launchGame` Deep Rock Galactic: Survivor; when its window has been up 60
   seconds, read; `deck_exitGame`; confirm with `pgrep`.
4. **A heavy game:** the AI still unloaded (check `/api/ps` is empty); `deck_launchGame` God of War; when its window
   has been up 90 seconds, read; **ask nothing, open nothing in the plugin**; `deck_exitGame`; confirm with `pgrep`;
   read once more. If the exit fails twice, stop pressing and report at once: the maintainer closes the game.

The evidence ends with one table: step, available MB, swap used, models loaded. The session sets the low-memory
warning's limit from it.

## D0a.6: one call for a list of questions (row P104-D0-RUNNER; only if your task says lane T1 has landed)

If your task does not say so, write "moved to block D1" and skip. Otherwise: nothing running, the test chat, Strategy.
Write a rows file in your scratch folder with three Hollow Knight questions of your own wording (rows
`P104-D0-RUNNER-a`, `-b`, `-c`). `deck_releaseMachine` (the script's own tool server needs the lease), then from the
shared checkout run the script the way your task quotes from lane T1's report. **Pass when** three evidence files
exist and each names the notes attached. Write the wall-clock time and the one call against D0a.3's numbers. If the
script refuses or stops, copy its message into the evidence: that is the finding. Your next `deck_*` call takes the
lease back.

## D0a.7: hand over

Leave the plugin open on Main in the test chat, the mode chip on Strategy, no game running, the AI unloaded, the hold
**kept**. `deck_releaseMachine`. `python scripts/deck_queue.py done <id> --result "<build; library version; no game;
hold kept until <time>>"`. The handover: the build, when the hold runs out, the settings backup's path, the test
chat's first question, the long test chat's first question, every setting you changed and whether it is back, the
memory table, and anything the next driver should know about the Deck today.

---

# D0b

Start as D0a.0 steps 1, 2 (renew the hold for 480 minutes), 3 and 5, with a new queue line ("plan 104 block D0b").
Nothing running for every row unless it says otherwise. These are **measurements**: write what you see, in numbers;
the only verdicts are "measured" and COULD NOT RUN, except the two owed rows at the end.

## D0b.1: Show details closed and reopened on the Session tab (row P104-M-REOPEN)

Last wave: close Show details with B, reopen with A, Session tab showing: the "Hide details" line that holds the ring
ended up above the visible pane, 4 times of 6; never with "This answer" showing. The fix depends on one thing nobody
has read: **what holds Steam's ring in the moments after A.**

1. In the test chat, an answer with a notes line. Walk to "Show details" (read the ring), A; Right on the strip to
   "Session"; B.
2. Read: the ring's control (label), the "Show details" line's box (top, bottom), the pane's top, the dock's top, the
   pane's scroll position, `document.hasFocus()`.
3. **A passive recorder, then the press.** With one `deck_readPage` call start a recorder in the page that, for three
   seconds, writes into its own list on every frame: the time, which element carries Steam's ring marker (its label,
   or "none"), the line's top, the pane's scroll position, the panel's top and height once it exists. It must change
   nothing on the page but that list. Press A (one press). After three seconds read the list back and delete it.
4. Read step 2's fields again, and take a picture.
5. Three tries with "Session" showing, two with "This answer" showing.

The evidence, per try: the ring's control in each of the first ten frames after the panel appears (this is the
answer the fix needs), the line's top before and after, the scroll before and after, the panel's height. If you cannot
build the recorder in two attempts, do the tries without it and say so.

## D0b.2: the "notes were used" line (row P104-M-CAPTION)

An answer that comes back wholly behind a cover, in Hollow Knight, Default spoiler row: ask, in your own words, what
waits at the very end of the game (last wave a question like that did it). If the answer is not wholly covered, one
more differently worded try, then COULD NOT RUN. With the ring on "Show details" under that answer: the box of the
line "Notes were used for this answer" (top, bottom), the dock's top, a picture. Then the ring on the question box:
the same numbers.

## D0b.3: the long chat's summing-up, and the summed-up note (rows P104-M-SUMUP-LOG and P104-M-SUMMARY-NOTE)

Switch to the long test chat (read its name). Strategy. One question about Hollow Knight, your own wording. Note the
seconds to the first word and to done.

- **P104-M-SUMUP-LOG:** `tail -n 200 ~/homebrew/logs/bonsAI/*.log | grep -a -i "summar"` and
  `journalctl -u plugin_loader --since "<the time you asked>" --no-pager | grep -a -i "summar"`: every line, word for
  word. Did a "summed itself up before this answer" row or a "Couldn't sum up" line show? Where on the screen (above
  or below the answer)? A picture.
- **P104-M-SUMMARY-NOTE:** if a summed-up note shows above the newest answer: from the answer's last paragraph press
  Down; from "Mark reply helpful" press Up. For each: where the ring landed, whether it moved at all, and
  `document.hasFocus()`. With the ring on the note: does A do anything, does B? If no note shows, write that and what
  the chat's summary date is in Show details, Session.

Switch back to the test chat before anything else.

## D0b.4: the Session tab's "What the AI remembers" card (row P104-M-SESSION-CARD)

Still in the long test chat for this row only (it has a summary): Show details, Session. Read: the card's box (top,
height), the pane's top, the dock's top, the number of characters and lines of its text. With the ring on the card:
press Down once: where does the ring go, and did the pane scroll? Press Up to come back, then Down three times,
reading after each. Can any press bring the card's last line above the dock? A picture with the ring on the card.
Back to the test chat.

## D0b.5: the second suggestion chip (row P104-M-CHIP-CUT)

Main tab, nothing running, the ring on the question box. Watch the second chip until its label is a long one (its
text longer than the chip is wide; up to two minutes). Then once a second for fifteen seconds read: the label's full
text, the chip's box, the label element's own width and its scroll width, and how far it has moved. Two pictures three
seconds apart. **The question to answer:** does every word of the label come into view at some moment, or are the
last words never seen?

## D0b.6: an answer whose cover opens by itself shows its notes line (row P103-NOTES-AFTER-AUTO-OPEN-01, owed)

Nothing running, the test chat. One Brotato question by the game's name, about an enemy, your own wording. **Pass
when:** no shut cover is drawn over the answer and the notes line is there (the read-back shows both). A picture.

## D0b.7: the hidden box on a game known only by its name (row STRAT-SPOIL-NAME-01, owed, unclear twice)

Last wave two boss questions got general answers with no hidden box, so nothing was tested. Unload the AI.
`deck_launchGame` with `title: "Doom 64: Retribution"` (one retry). When its window has been up 30 seconds: `free -m`
(4,000 MB or more available, or skip); close and reopen Quick Access; the Context line names the game. Then the row's
own steps in `docs/testing-manual.md` under STRAT-SPOIL-NAME-01, with questions of your own wording that ask for
something the game keeps for late: what the last level holds and how its final fight goes, without naming the boss.
Two differently worded tries. **Pass when** the reply puts the late-game part behind a hidden box. If the AI writes
no late-game detail in either try: UNCLEAR, with what it wrote. `deck_exitGame`; confirm with `pgrep`.

## D0b.8: hand over

As D0a.7, with the queue's `done` line. Add: for each measurement row, the one line the fix lane needs.

---

# D0c

Start as D0a.0 steps 1, 2 (renew the hold), 3 and 5, with a new queue line ("plan 104 block D0c, about 45 minutes").

## D0c.1: the Show details strip, the cases last wave did not reach (row P103-DETAILS-STRIP-01, the in-focus half)

Nothing running. For each case: walk to "Show details" on the newest answer (read the ring), A, then Down from "Hide
details": **pass when** the ring lands on the "This answer / Session" strip (with a notes line above it: the notes
line first, the strip on the next Down), three tries. The cases: (a) a fresh chat with one answer (start a new chat
with a Hollow Knight question of your own wording; its first question goes in the handover for block DR to delete);
(b) a second fresh chat the same way; (c) in the test chat, an older answer, if Show details can be opened on it; if
it cannot, say so; (d) a wholly covered answer (D0b.2's, or make one the same way).

## D0c.2: the page out of focus (row P104-M-LOSTFOCUS, then the two owed halves)

Two fixes have never been checked with the panel's page out of focus, because the Deck never showed that state when
asked. Old evidence holds a way that did produce it.

1. **Before the game:** in the test chat, one Hollow Knight question that attaches notes (so the newest answer has a
   notes line), and open the thumbs-down row's state the way row P102-UNDO-FOCUS-01 in `docs/testing.md` asks. Unload
   the AI.
2. `deck_launchGame` Deep Rock Galactic: Survivor. Wait until its window has been up **eleven minutes** (under ten it
   never worked). `free -m` at the start and the end of the wait. Ask nothing while it runs.
3. **The recipe:** open the plugin; Left to the paperclip (read the ring); A; in its menu, A on "Close menu & take
   screenshot" (if that entry is not there, the picture permission is off: write that, and use the second way below);
   then the Quick Access chord (`deck_pressChord`, hold GUIDE, tap A) to reopen. Read `document.hasFocus()` on the
   panel's page and where the ring is.
4. **The second way,** if step 3 reads "has focus": walk to "Delete chat" on the title row (read the ring), A (Steam's
   "Delete chat?" box opens), **B** (never A in that box); read `document.hasFocus()`.
5. Three attempts in all. **If the page reads no focus**, do not close Quick Access, and run, reading
   `document.hasFocus()` after every press:
   - **P103-DETAILS-STRIP-01, the out-of-focus half:** from the notes line, Down: the ring lands on the open details
     panel's strip, not on the suggestion chips. Three tries.
   - **P102-UNDO-FOCUS-01:** the row's own walk after Undo: the four Downs go notes line, strip, chip, and none stops
     dead.
   Write for each: PASS or FAIL **with the page out of focus**, and the focus reading beside every press.
6. **If the page never reads no focus:** both halves are COULD NOT RUN, and the evidence says "three attempts, eleven
   minutes of game, both ways". They then go on the maintainer's list as proven by their tests only.
7. `deck_exitGame`; confirm with `pgrep`; `free -m`. Put back anything the recipe changed (a screenshot it took is
   named in the handover's put-back list).

## D0c.3: hand over

As D0a.7. Add the first questions of the two fresh chats, and whether the out-of-focus state was reached and by which
way.

---

# For the session: recipes the later runbooks need

Collected on 2026-11-14 from the plan 96, 97 and 103 runbooks and their evidence files, so blocks D1 to DR can be
written without looking them up again. Plan 103's later runbooks (`103-runbook-block-D1.md`, `-D2.md`, `-D3-DR.md`)
are the shape to copy.

- **The session's library on the Deck.** Back up first: `cp -a <rag_corpus_path> /home/deck/p104-rag-published-backup`.
  `scripts/build.ps1` copies `build/knowledge-base-seed/` to `/home/deck/homebrew/settings/bonsAI/seed-knowledge-base/`.
  Then on the Deck: Settings, Data, "Show Developer tab" on; the Developer tab; walk to "Install seed knowledge base"
  (read the ring); A; wait up to 60 seconds; `rag_corpus_version` then reads the seed's version
  (`python3 -c "import json;print(json.load(open('/home/deck/homebrew/settings/bonsAI/seed-knowledge-base/corpus-manifest.json'))['version'])"`).
  The installed library lives at `/home/deck/.bonsai/rag` by default.
- **Putting the published library back (block DR).** Read the Internet downloads switch first; if it is off, do not
  press Remove. Ollama tab, the knowledge base section: Remove (read the ring, A, confirm), then Download (read the
  ring, A, confirm; "Internal storage"); wait up to three minutes; `rag_corpus_version` reads **2026.11.10** and the
  screen reads "Installed". If the download fails twice: stop and report; the backup folder is the session's to
  restore, not the driver's. Remove the backup folder only after this has passed.
- **The settings put-back.** The mode chip to what D0a found; the spoiler row Default; "Read game & screenshot
  context" as found; "Show Developer tab" off; then compare key names only against this plan's backup unpacked under
  `/tmp`. Then delete `/home/deck/p104-settings-backup.tgz` (plan 104 § 9), and say so.
- **A first start without wiping anything (row P104-FIRST-RUN-01; D141, call 23).** Never "Clear all data". Turn
  Steam's performance overlay off first. Write both moves into the put-back list **before** making them. Move the
  settings file aside: `cp ~/homebrew/settings/bonsAI/settings.json ~/p104-settings.json.bak && rm
  ~/homebrew/settings/bonsAI/settings.json`, then reload the plugin (nothing running). For the "Not installed" state
  the Ollama program must also be out of the way: stop the user unit `bonsai-ollama-autostart` and move
  `~/.local/bin/ollama` aside (stopping alone is not enough: the unit starts it again). Put back in the same block:
  restore the program, `systemctl --user restart bonsai-ollama-autostart.service`, restore the settings file
  (`cp ~/p104-settings.json.bak ~/homebrew/settings/bonsAI/settings.json`), reload, and check the header reads the old
  "chat N of M", `api/tags` lists the same models, and the `.bak` file is removed.
- **The page out of focus.** The recipe in D0c.2 (plan 97's evidence: `plan97-P97-L14-FREEZE-try5.json`,
  `plan97-P97-B-AFTER-POPUP-FOCUS.json`).
- **The low-memory warning (rows P104-MEMORY-01 and -02).** The heavy game is launched with the AI unloaded and left
  for a minute; one question; the warning is read; `/api/ps` is read (it must be empty) and `free -m` (it must not
  drop by more than a few hundred MB); the ring is walked to "Ask anyway" and read; **A is not pressed.** Exit the
  game. "Ask anyway" is pressed once, with a light game, the way lane G1's report says.
- **Rows whose questions must name a subject from the new file** (P104-NOTES-HL2-BM-01, and P103-NOTES-23-01 again for
  Fallout 4, Brotato and DOOM Eternal): take the subjects from the note lanes' name lists, not from the game. Last
  wave's misses were questions about subjects only the older notes hold.
