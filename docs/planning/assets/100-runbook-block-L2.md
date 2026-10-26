# Plan 100, Deck block L2: the wave 2 checks (lowered notes, "Suggest as a tip", the four games' notes) and second rounds

For a fresh deck-driver helper, after the wave 2 landings and one deploy by the session (`scripts/build.ps1`, which also
refreshes the Deck's seed folder with the night's library). Read [the L1 handover](100-handover-L1.md) first. The rules
of your helper file apply in full. Evidence files go to `C:\Users\still\Documents\bonsAI-workshop\test-evidence\plan100-<ROW>.json`
(never overwrite; `-try2` if the name exists), screenshots beside them with the same stem. **Save a screenshot of every
look this runbook names**; the maintainer judges them from the checks page. Every Deck command is exactly
`ssh deck@192.168.86.52 '<command>'`. Stop at once if the rig's lease is held by another chat, if focus moves without
your press, or if anything asks for a password. Questions, page reads, the log's attach line and the saved chat: as in
[the L1 runbook](100-runbook-block-L1.md)'s opening. The test chat is the long Mantis Lords chat unless the L1 handover
says otherwise. **Before every question, read the chat's name.**

**Facts for the 2026-10-26 run (written by the session at 00:35 UTC):** the wave 2 build (every lane of plan 100) was
deployed at 00:29 UTC with `scripts/build.ps1` (156 files verified); the build hash on the Deck must read
`222279568b09`. The seed library on the Deck is the night's final library and its version string is now
**2026.10.26** (the build date), so after "Install seed knowledge base" `rag_corpus_version` reads 2026.10.26; its
`corpus.db` is 3,424,256 bytes dated Oct 25 20:29 Deck time. **Block L1 did not run** (the rig's tools dropped out of the
session's chat), so this block runs L1's checks too, as L1's runbook lists them, before its own: install the library
(L1.0 step 4), then L1.1 to L1.9, then L2.1 to L2.3, all on this one build. The Deck as L0 left it: the plugin open on
Main in the test chat (the long Mantis Lords chat; no chat is literally named "test"), the mode chip on Speed, no game
running, keep-awake until 05:55 UTC (renew it), the settings backup at `/home/deck/p100-settings-backup.tgz`, three
saved chats, "Show Developer tab" off. The deploy restarted the plugin twice tonight, so the first open may fail once.
The driving chat commits nothing and writes its handover to
`C:\Users\still\Documents\bonsAI-workshop\planning\assets\100-handover-L2.md`.

## L2.0: setup (row P100-L2-SETUP)

1. `deck_status` (the stop switch off, no other chat's lease); `deck_holdAwake` 480 min; `expiresAt` into the evidence.
2. The build: `sha256sum ~/homebrew/plugins/bonsAI/dist/index.js | cut -c1-12` must equal the hash in your task. Open
   the plugin (the first open after a deploy may fail once).
3. The installed library: `rag_corpus_version`, `rag_corpus_path`, `ls -l <path>/` (the night's library is 3,424,256
   bytes; if the installed file is the older 3,145,728-byte one, install the seed again as L1.0 step 4 did).
4. The thumbs-down file before anything: `ls -l ~/homebrew/settings/bonsAI/rag_demote.json` and its content (L0 left it
   holding an empty notes list). Record it.
5. The mode chip to Strategy (back to Speed at the end); `spoiler_tier` default; no game running; `free -m`.

## L2.1: the "ranked lower by you" tag and the Lowered notes row (row P100-LOWERED-01, lane U)

Nothing running, Strategy, the test chat.
1. A boss question with notes: "In Deep Rock Galactic Survivor how do I beat the dreadnought twins". When it finishes:
   walk to "Not really" (read focus; it sits beside Helpful in the rating row) → A → walk to "Wrong tip" → A → "Which
   note was it?" → A on the first note. Read the gold line naming the note.
2. Walk to Show details → A → the notes chip: **the first note carries "ranked lower by you"** (screenshot `-tag.png`).
   B out.
3. Walk to Undo (read focus) → A. Show details → A again: **the tag is gone on this same answer** (screenshot
   `-undone.png`). B out. `cat ~/homebrew/settings/bonsAI/rag_demote.json`: no entry for the note.
4. Two more marks on two notes from two questions: "how do I deal with the praetorian in Deep Rock Galactic Survivor"
   → Not really → Wrong tip → the first note; then "Deep Rock Galactic Survivor: what beats the acid spitter" → the
   same. The file now holds two notes.
5. Ollama tab → the Knowledge base section (open it) → walk Down from the switch: Update, then **"Lowered notes: 2"
   with a Clear button** (read focus on Clear; screenshot `-row.png`), then the Reply style line. Remove is reached by
   Right from Update, never by Down (the Deck record agrees); say where Up from Clear lands (Update or Remove; either is
   fine, record it). Then from the Reply style line, Up: **lands on Clear**.
6. A on Clear → the confirm box ("Clear lowered notes?"); B: the box closes and **the ring is back on Clear**. A on
   Clear again → walk to the Clear button in the box → A: **the row is gone and the ring lands on Remove** (screenshot
   `-cleared.png`). A row still reading "2" after the box closes is a FAIL (the count did not re-read). Over SSH the
   file reads `{"version":1,"notes":{}}` (or has no notes).
7. Back on Main, a reworded boss question ("what is the trick to the dreadnought twins in Deep Rock Galactic
   Survivor"): the notes block lists the twins note again in its old place (no longer ranked lower). Known and not
   fixed: an OLDER answer's saved tag stays until a new question; do not count it.

## L2.2: "Suggest as a tip" (row P100-SUGGEST-01, lane J)

Nothing running, Strategy, the test chat. "Hollow Knight: how do I open the way to the Soul Sanctum". When it finishes:
1. Walk the reply row (read focus at each stop): Helpful, Not really, **"Suggest as a tip"**, then onward; no stop twice;
   every stop hears B (B from the button does what B from Helpful does). Screenshot the button (`-button.png`).
2. A on "Suggest as a tip": **a line appears under the row, "Saved <file>. To send it in: <link>"**, the link as text
   (screenshot `-saved.png`). Copy the file name. Over SSH: `ls -l ~/Desktop/bonsAI_logs/suggested-tips/` shows the file;
   `cat` it: five fields (section_id, game_id, section_type, name, card), the card starting "Suggested by a player on
   2026-10-…:", no source fields, valid JSON. Record the file name and the link's address (the GitHub new-issue address
   with a title).
3. Permissions tab → "Save files to Desktop" → off (read it). Main, **a NEW short question** ("Hollow Knight: where is
   the first bench"): after a good save the button on the earlier answer is inert by design, so the refusal shows only
   on a fresh answer. When it finishes: **A on Helpful first, then read focus: it must be on "Suggest as a tip"** (not on
   nothing, not on Show details; this is the one route the lane changed). Then A on "Suggest as a tip": **the line says
   the write is disabled and names the Permissions tab** (screenshot `-refused.png`); over SSH no new file. Then
   Permissions → "Save files to Desktop" → on again (read it).
4. The look check on Main with the saved line showing (`probe_deck_ui_look.py`): nothing against the right edge or cut off.

## L2.3: the four games' notes (row P100-FOUR-GAMES-01, lanes N1 to N4)

The night's library installed (L2.0 step 3). Nothing running, Strategy, the test chat.
1. "in Portal 2 how do I get past a turret": the attach line names a turret note (Sentry Turret or Defective Turret) and
   the notes block shows it. Screenshot.
2. "in GTA San Andreas what does body armor do": the attach line names the Body Armor note. Screenshot.
3. "The Sims 4: how do I stop a fire": the attach line names the Fire note (1200) or the Smoke alarm note; record which,
   and whether the older "Fires" seed note came too (the two disagree about firefighters; a known bug).
4. "Baldurs Gate 3 how do I handle Minthara": the attach line names the Minthara note; the answer must not reach the
   grove's outcome unless the cover rule hides it; record the answer's last 600 characters for the maintainer's read.
**Pass when** 1 and 2 attach their notes; 3 and 4 are MEASURED for the maintainer.

**Saved walks:** any saved walk whose route passes Down through the rating row or Up from Show details now meets one
more stop (the button). A replay that differs only by that stop is re-saved from its own start state, not called a
failure; say which walks that touched.

## L2.4: second rounds

Any L1 row that FAILED or was UNCLEAR, re-run as its L1 step says, under `-try2`. The session's task text names them.

## L2.5: handover (`100-handover-L2.md` in the scratch folder)

The build; the keep-awake expiry; the test chat; the library installed (the night's); every setting changed and whether
it is back (mode chip to Speed; "Save files to Desktop" on; the Developer tab switch off); the thumbs-down file's state;
the suggested-tips folder's contents (leave the file for the maintainer); the rows with their verdicts and screenshot
names; the Deck's state; anything that surprised you.
