# Plan 104, Deck block D2: the fixes in deploy 2

Written 2026-11-16 by the chat running plan 104. Deploy 2 carries the fixes built after blocks D1 to D1c: the
question runner, the chips, the plain Tank question, the Ollama tab's version line, games with no notes, a question
that ends ", give me ...", "Ask anyway" one press up, the answer screen's Show details and "Notes were used" line, the
summed-up note as a stop, and the Session tab's card.

**Three parts, three drivers, one after the other.** D2a asks questions; D2b presses the D-pad; D2c checks the new
notes (the plan's block D3 rows, moved here because the library on the Deck is already final). Each is for one fresh
`deck-driver` helper (Sonnet 5.5 medium). The helper file's rules apply in full, and so does **everything above the
line "# D0a" in `docs/planning/assets/104-runbook-block-D0.md`** (evidence names, the one way to write a Deck command,
what the maintainer allowed, the freeze rules, asking a question, keeping replies small, unloading the AI): read that
part first. Also read **D1.0 step 6 of `104-runbook-block-D1.md`** (Steam back to its Home screen before a launch;
launch by appid: Stardew Valley 413150, Left 4 Dead 2 550, Deep Rock Galactic: Survivor 2321470, God of War 1593500).
Evidence goes to `C:\Users\still\Documents\bonsAI-workshop\test-evidence\plan104-<ROW>.json` (never overwrite;
`-try2`, `-try3` if taken), a picture beside every look. Handovers:
`C:\Users\still\Documents\bonsAI-workshop\planning\assets\104-handover-D2a.md` and `-D2b.md`. You commit nothing and
you do not deploy. **Read the last handover first** (your task names it).

**Keep your replies small.** Never call `deck_listGames`. Read pages by a small part. Prefer one `ssh` command that
prints a few lines. If your working memory runs low, write the handover at once with the exact next step and stop.

**Freeze rules:** `free -m` before every question and every launch (under 3,000 MB available: skip and say so);
unload the AI before every launch; never a question with a heavy game running, except D2b.1, where the warning stops
the AI loading; never reload the plugin with a game running; two timeouts in a row: stop and hand over. **Never press
the Ollama tab's Update button. Never "Clear all data". Never press A on the question box.**

The test library 2026.11.16 stays installed; nothing in deploy 2 needs a new one.

---

# D2a: the question rows

## D2a.0: setup (row P104-D2A-SETUP; one evidence file)

As D1.0 steps 1 to 3 and 5 of the D1 runbook, with a new queue line ("plan 104 block D2a, about 75 minutes"): the
build hash must read the one in your task; renew the hold for 480 minutes. Write `rag_corpus_version` (that key only),
the mode chip, which screen is live (the page's width and height), and that no game runs.

## D2a.1: the Ollama tab's version line (row P104-OLLAMA-VERSION-01)

Nothing running. Open the Ollama tab; read the line "Connected · Ollama v…" (or its wording). Read
`ssh deck@192.168.86.52 'curl -s 127.0.0.1:11434/api/version'`. Close and reopen Quick Access, press Test connection,
read the line again. **Pass when** the line's version matches `api/version` both times. A picture. Press nothing else
on that tab.

## D2a.2: one call for a list of questions, third try (row P104-D0-RUNNER)

As D1.1 of the D1 runbook, with two changes: use the **long test chat** (it has three or more earlier turns folded
under "N earlier": the shape that failed), and three Hollow Knight questions of new wording. **Pass when** each row
finishes at its first finished read (about 20 to 60 seconds, not 242), no row ends as a timeout, and each evidence file
names the notes. Write the wall-clock time per row. If it passed, you may use it for D2a.3 (one rows file per row,
with that row's `expect`; say so in each evidence file).

## D2a.3: games with no notes, and ", give me ..." (rows P104-M8-NO-NOTES-GENRE-CARD and P104-M9-TRAILING-PHRASE)

Nothing running. Switch the mode chip to **Expert** (write it on the put-back list; back to Strategy at the end).
- **P104-M8-NO-NOTES-GENRE-CARD:** one question naming Terraria, in your own words (for example how to get ready for
  the Wall of Flesh). **Pass when** the reply ends with the "No notes for this game" line, the words "Vigor" and
  "Energy" are not in the answer, and the plugin log's attach line for it names no note (no "Soulslike basics"):
  `ssh deck@192.168.86.52 'grep -h "attach\|genre" ~/homebrew/logs/bonsAI/*.log | tail -5'`.
- **P104-M9-TRAILING-PHRASE:** one question about a boss that does not exist in Hollow Knight, named as a boss,
  ending in a comma and a request, in your own words (for example "In Hollow Knight, how do I beat the boss called
  Quillgrave, give me the full attack pattern"). **Pass when** the reply ends with the "No close match" line.
Mode chip back to Strategy.

## D2a.4: a plain Tank question, second try (row P104-VERSUS-TANK-01)

As D1.3 of the D1 runbook, Strategy only, one question: a plain Tank question in **new** wording (not "what is a good
way to deal with a Tank when one shows up"), naming no mode and no side. **Pass when** the Tank note leads and no
versus-kind note is attached beside it ("Playing as the Tank" may attach; it is not a versus note). Then one more
plain question about the Charger, same rule ("Playing as the Charger" may attach). `deck_exitGame`; confirm with
`pgrep`; Steam back to Home; `free -m`.

## D2a.5: the two chips after an answer, third try (row P104-CHIPS-CLOSEST-01, with a recording)

As D1b.2 of `104-runbook-block-D1b.md`, with these changes from the lane's report: **unload the AI before the launch**;
ask about the **Dreadnought Twins** in new words; **start timing when the "Was this helpful?" row appears** (that is
the end of the answer); read the two chips' labels every second for ten seconds; keep the recording running until at
least **60 seconds after the answer ends**. **Pass when** within five seconds of that row appearing both chips are
about the Twins or the notes next to them (the lane expects the Twins note and the Glyphid Dreadnought note, either
order). Chips that change again later are the normal rotation, not a fault. This also closes P103-CHIP-ORDER-01.
`deck_exitGame`; confirm with `pgrep`; Steam back to Home.

## D2a.6: hand over

The plugin on Main in the test chat, the mode chip on Strategy, no game, the AI unloaded, the hold kept, Steam on
Home. `deck_releaseMachine`. `python scripts/deck_queue.py done <id> --result "<build; no game; hold until>"`. The
handover: each row's verdict and file; the put-back list; the first question of any new chat; anything D2b should
know.

---

# D2b: the D-pad rows

## D2b.0: setup (row P104-D2B-SETUP; one evidence file)

As D2a.0, with the queue line "plan 104 block D2b, about 90 minutes". Read D2a's handover first.

## D2b.1: "Ask anyway" one press up (row P104-M5-WARNING-FOCUS)

Use **Speed** for the question (no extra model loads). Unload the AI and check `/api/ps` is empty. `deck_launchGame`
God of War (1593500); when its window has been up 60 seconds, `free -m`. Close and reopen Quick Access. One question in
your own words; the reply is the low-memory warning (a picture; if it is not the warning, write what it is and skip
the rest). Then, reading the ring after each press:
1. Down once: the ring is on the question box.
2. Up once: **pass** if the ring is on "Ask anyway" and the whole button is visible (its box inside the pane and above
   the dock). **Never press A on it.**
3. Down once: the ring is on a suggestion chip. Down again: the question box.
4. From a chip, Up: **pass** if the ring is back on "Ask anyway".
`deck_exitGame`; confirm with `pgrep`; Steam back to Home; `free -m`. If the exit fails twice, stop and report at once.
Mode chip back to Strategy.

## D2b.2: the "notes were used" line above the dock (row P104-COVERED-CAPTION-01)

Nothing running, Strategy, the test chat, the spoiler row on Default. Ask a question whose answer the cover hides, in
your own words, about Hollow Knight's true final boss and its last ending (type and send it the usual way). Check the
line "Notes were used for this answer…" is drawn under "Show details". If it is not, the answer used none of its notes:
ask once more in new words, and if it is still not drawn, write COULD NOT RUN with what you saw. Then walk Up from the
question box until the ring is on the in-chat "Show details" (the element with class `bonsai-chat-details-divider`,
not the dock's stand-in line). Read the line's box and the dock's top. **Pass when** the line's bottom is at or above
the dock's top and "Show details" is fully on screen. Three tries (the same answer, walking away and back). A picture.

## D2b.3: Show details reopened keeps the ring in the pane (row P104-DETAILS-REOPEN-01)

As D0b.1 steps 1, 2 and 4 of the D0 runbook (the recorder of step 3 is welcome if it costs you little). Six tries with
the Session tab showing and nothing running, then six with Stardew Valley (413150) running (AI unloaded before the
launch; ask nothing), and two with "This answer" showing. **Pass when** the "Hide details" line holding the ring sits
inside the pane every time (its top at or below the pane's top; the lane expects about the pane's top plus 8). Write
which screen is live: the fault was only ever seen on the Deck's own screen; if the external screen is live, say so (the
row then stays owed for the Deck's own screen). `deck_exitGame`; confirm with `pgrep`; Steam back to Home.

## D2b.4: the Session tab's card fits (row P104-SESSION-CARD-01)

The **long test chat** (it has a summary). Show details, Session. Read the card's box, the pane's top and the dock's
top. With the ring on the card, press Down, reading the ring and the card's text position after each, until the ring
leaves the card. **Pass when** the whole card is above the dock (its bottom at or above the dock's top), the text
scrolls inside it, a "More below (press Down)" line shows while there is more, and the last Down moves on to Rename.
A picture with the ring on the card (it goes on the checks page). Back to the test chat.

## D2b.5: the summed-up note is a stop (row P104-SUMMARY-NOTE-STOP-01)

Only a question can make the note (the "Sum up this chat" button never does). In the **long test chat**, Strategy,
nothing running: ask long-answer Hollow Knight questions one at a time, in new words each, **at most six**. After each
answer read `ssh deck@192.168.86.52 'grep -h "chat_summary" ~/homebrew/logs/bonsAI/*.log | tail -2'`. "none due" means
not yet. The question whose line says "chat_summary: written … covered K turns" carries the note under its answer (the
wait may say the chat is being summed up, up to about 40 seconds more). If none of the six writes one: COULD NOT RUN,
with the last log line. If one does, on that newest, unrated answer, three tries each:
1. Down from the answer's last paragraph: **pass** if the ring lands on the note.
2. Up from "Mark reply helpful" (or, with choices drawn, Up from choice A): **pass** if the ring lands on the note.
3. A on the note: **pass** if Show details opens on the Session tab and the note (or "Sum up this chat") stays inside
   the pane.
4. B on the note: **pass** if it does what B does on "Mark reply helpful" (write what that is).
Write the questions you asked in the handover.

## D2b.6: the look check (row QA-LOOK-01-p104, second part)

As D1.6 of the D1 runbook, on the Main tab (the newest answer showing its notes line), the Ollama tab, and Show
details' Session tab. A picture of each.

## D2b.7: the free-play sweep (row P104-SWEEP, second part)

As D1.7 of the D1 runbook, with nothing running and then with Deep Rock Galactic: Survivor running (AI unloaded before
the launch; ask nothing). Save a walk that passes with `deck_saveCheck`.

## D2b.8: hand over

As D2a.6. The handover also lists every chat this block made (first question of each) for the put-back.

---

# D2c: the new notes (the plan's block D3 rows; the library on the Deck is already the final one)

No note has changed since deploy 1, so the test library 2026.11.16 on the Deck is the session's final library and
block D3's rows run here, on deploy 2. One fresh driver, after D2b. Setup as D2a.0 with the queue line "plan 104 block
D2c, about 60 minutes" (row P104-D2C-SETUP). Nothing running for every question in this part unless a row says so;
Strategy; the test chat. Read which notes attach from the read-back and the log's attach line. A question is worded
once, in your own words, naming the game.

## D2c.1: Half-Life 2 and Black Mesa (row P104-NOTES-HL2-BM-01)

Two questions per game, each naming a subject the new notes cover. Half-Life 2 (notes 2600 to 2614): for example the
Antlion Guard, Manhacks, the Gunship, the crossbow, headcrab kinds, health chargers. Black Mesa (notes 4300 to 4311):
for example the Houndeye, the Gargantua, the Tau Cannon, the Gonarch, the Long Jump Module. **Pass when** each of the
four questions attaches a note from that game's new file (its number in the 2600s or the 4300s). This closes Phase 5.

## D2c.2: the three games plan 103 missed (row P103-NOTES-23-01, the missed games)

One question per game, by the game's name, about a subject only the newer file has (not one older notes also cover):
Fallout 4 (for example Radscorpions or Mirelurks), Brotato (for example the Looter or the Monk), DOOM Eternal (for
example the Carcass or the Prowler). One retry per game with another subject from the same list if the first attaches
only older notes. **Pass when** each game attaches a note from its newer file; write the note's number. With plan 103's
17 of 20, three passes here make 20 of 20 (write the count either way).

## D2c.3: more versus notes, and no ending given away (row P104-VERSUS-02)

Left 4 Dead 2 named in the question (nothing running). Two versus questions in your own words (for example about
Scavenge as the survivors, or bluffing as the infected). **Pass when** each attaches one of the new versus notes
(numbers 4515 to 4529). Then one question about a campaign's last map (for example what happens at the end of Dark
Carnival's last map): **pass when** the reply does not give the ending away (the hidden box, or no ending told).

## D2c.4: the saved knowledge-base walks, again on this build (no row of its own; write it in the handover)

Replay each with `deck_replayChecks` (`checksDir` = `C:\Users\still\Documents\bonsAI-workshop\checks`):
`plan70-KB-FOCUS-01-v2`, `plan70-KB-UPDATE-row-walk`, `P98-ROUTE-01`, `P86-GLOSSARY-WALK`,
`p103-d1-sweep-main-nogame`, `P102-R1-SWEEP-main-nothing-running`. Never press the Ollama tab's Update button: if a walk
would press it, skip that walk and say so. Each that passes is saved again with `deck_saveCheck` under its name plus
`-p104` (never over the old file). Each that fails: write where it stopped; do not try to mend it.

## D2c.5: "Sum up again" shows whole (row P104-M11-SUMUP-AGAIN-REVEAL; deploy 3 only)

Only if your task says the build is deploy 3 (it carries this fix). The long test chat, Show details, Session. Down onto
the card, Down to read to its end, then Up until the ring leaves the card. **Pass when** "Sum up again" holds the ring
and its box sits wholly between the pane's top and the dock's top. Three tries; then once more with Stardew Valley
(413150) running (AI unloaded before the launch; ask nothing). A picture. `deck_exitGame`; confirm with `pgrep`.

## D2c.6: "More below" follows a Text size change (row P104-M12-MORE-BELOW-STALE; deploy 3 only)

Only on deploy 3. Write the Text size setting as you find it on the put-back list first. On that size, read the card
to its end (the "More below" line goes blank). Settings, Text size: Large. Back to the Main tab; reopen Show details and
the Session tab if they closed; Down onto the card. **Pass when** the line reads "More below (press Down)" while text
remains, Down reads on, and the line goes blank only at the true end. A picture. **Put Text size back** as found and
read it back.

## D2c.7: hand over

As D2a.6. The handover lists every chat this block made (first question of each) for the put-back.
