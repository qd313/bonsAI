# Plan 102, Deck block R1: one check per landed fix, on the night's build with the night's library

For a fresh `deck-driver` helper (Sonnet 5.5 medium) started from **a chat that has the rig's tools**, after block R0's
handover ([102-handover-R0.md](../../../../bonsAI-workshop/planning/assets/102-handover-R0.md), read it first) and
after the session's landings. The rules of the helper file apply in full; the opening of
[runbook R0](102-runbook-block-R0.md) (questions, the attach line, the test chat, the saved chat, evidence names, every
Deck command as `ssh deck@192.168.86.52 '<command>'`) applies here word for word. Evidence files
`plan102-<ROW>.json`, screenshots beside them with the same stem. The driving chat commits nothing and writes its
handover to the workshop's `planning/assets/102-handover-R1.md`.

**Facts for the run (written by the session 2026-11-03, 20:40 EST):**
- The deploy is done: the session ran `scripts/build.ps1` from the shared checkout at tip `b85dcd70` (the code tip is
  `9615dc19`; the commits above it are plan documents), 156 files verified, the plugin restarted. The build hash on the Deck
  reads `9bc29b3c0500` (`sha256sum ~/homebrew/plugins/bonsAI/dist/index.js | cut -c1-12`); do not deploy again. **Never
  reload with a game running.**
- The night's library is in the Deck's seed folder: version `2026.11.04`, `corpus.db` 4,096,000 bytes, 583 notes and 167
  tips, every meaning vector. The published library 2026.10.25 (3,145,728 bytes) is what is installed until R1.0 step 3
  installs the seed; block RR puts the published one back.
- Lane D landed a picture shape, so R1.6 runs.
- Block R0's handover (`workshop:planning/assets/102-handover-R0.md`) left ten saved chats on the Deck, the mode chip on
  Speed, the Developer tab hidden, both models unloaded, no game running, and a stuck suspend overlay over Home; the
  session cleared the overlay with a sleep and wake through the rig before starting you (if Home is still covered, stop
  and report). At ten saved chats, New chat asks which to delete: use the test chat (the long Mantis Lords chat) for
  every check and make no new chat; where a check says a fresh chat, use the test chat and say so in the evidence.

## R1.0: setup (row P102-R1-SETUP)

1. `deck_status` (the stop switch off, no other chat's lease); `deck_holdAwake` 480 min; `expiresAt` into the evidence.
2. The build hash (above). Open the plugin (the first open after a deploy may fail once; a second failure is worth
   reporting). The seed folder's version:
   `python3 -c "import json;print(json.load(open('/home/deck/homebrew/settings/bonsAI/seed-knowledge-base/corpus-manifest.json'))['version'])"`.
3. **Install the night's library:** Settings → Data → "Show Developer tab" on (note it; back off at the end), the Developer
   tab → walk to "Install seed knowledge base" (read focus) → A; wait up to 60 s; `rag_corpus_version` must now read the
   seed's version; `ls -l <rag_corpus_path>/` shows the larger file with a fresh date.
4. The mode chip to Strategy (Speed back at the end); `spoiler_tier` default; no game running; `free -m`; the test chat's
   name read.

## R1.1: the Sims 4 fire notes agree (row P102-SIMS-FIRE-01, lanes B and M)

Nothing running, Strategy, the test chat. "The Sims 4: what do I do when a fire starts" (worded once). **Pass when** the
log's attach line names Sims 4 notes about fire and every attached note that mentions firefighters says they come on
their own when a smoke alarm is in the room (read the saved chat's notes and the answer; the older "Fires" note must no
longer say there are none). Show details → the notes chip, screenshot (`-notes.png`). An answer that says there are no
firefighters is a FAIL. If a tap-to-define word "fire extinguisher" shows, open it and read its line too (the glossary
entry changed as well).

## R1.2: "can't find my PC" reaches the new tip (row P102-FINDPC-01, lane H)

Nothing running, Strategy, the test chat. "cant find my pc on the network" with the send-question script. **Pass when**
the answer carries a Deck tip about the same home network and port 11434 (the notes block or a tip chip; screenshot
`-tip.png`) and the log's attach line names a tip (id 167). Then a boss question, "how do I beat the Hornet in Hollow
Knight": no tip attached (notes may be). A game question about a computer terminal, "in Fallout 4 where is the computer
terminal in the vault", attaches no network tip either (the tightened words; record what it did attach).

## R1.3: the eight thin games answer from their new notes (row P102-THIN-GAMES-01, lanes N5 to N12)

Nothing running, Strategy, the test chat; eight questions, one per game, each worded once:
1. "in GTA 5 what does body armor do" (expect a Grand Theft Auto V note, id 1409 or another from the 1400s)
2. "in GTA IV what happens when I reach three wanted stars" (a Grand Theft Auto IV note, 1500s)
3. "in Super Mario 64 how do I get past the Chain Chomp" (a Super Mario 64 note, 1600s)
4. "Paper Mario the Thousand Year Door how do I beat Doopliss" (a Paper Mario note, 1700s)
5. "Pikmin 2 what are White Pikmin good for" (a Pikmin 2 note, 1800s)
6. "Doom 64 how do I kill a Cyberdemon" (a Doom 64 note, 1900s)
7. "Donkey Kong 64 how do I beat Mad Jack" (a Donkey Kong 64 note, 2000s)
8. "Mario Kart 64 what does the fake item box do" (a Mario Kart 64 note, 2100s)
For each: the log's attach line (the note names and, from the saved chat, the section ids); screenshot the notes block
(`-1.png` to `-8.png`). **Pass when** six or more of the eight attach a note from the new files; name the misses and what
attached instead. Record any answer that gives away a story beat on question 4 (Paper Mario is a story game): that is a
finding, not a fail of the row.

## R1.4: Undo, then Down, with the page out of focus (row P102-UNDO-FOCUS-01, lane C; the advisor's shape)

1. **Unload the Deck's AI first** (R0.5 step 1), then launch Deep Rock Galactic: Survivor with `deck_launchGame`; wait 30
   seconds with its window in front; close and reopen Quick Access; the Context line names the game. Never reload the
   plugin with the game running.
2. The test chat, Strategy. A boss question whose answer attaches a note: "how do I handle the glyphid dreadnought's charge
   in Deep Rock Galactic Survivor" (worded once). **Open Show details first and leave it open.**
3. Walk to Not really, A; Wrong tip, A; the note (if "Which note was it?" shows), A. "Marked not helpful / Undo" shows with
   Undo holding the ring (read focus).
4. **Before any further press, read the page's focus:** `document.hasFocus()` must be false. If it reads true, close and
   reopen Quick Access until it reads false (at most four tries; each reopen may empty the question box, which is fine
   here); if it never reads false, record the row as NOT REPRODUCIBLE TONIGHT, not as a pass, and go on.
5. Then Down four times, the ring and the page's focus read after each press: expected landings Suggest as a tip, Show
   details (it reads "Hide details" while open), the notes block, then the fourth press. **The row passes only if the
   fourth press moves the ring to a new stop** (the details tabs row is expected; any other stop is a pass with the
   landing named) **and the plugin log shows the hop declining rather than a dead press** (read the last 40 log lines
   after the fourth press and copy the hop lines). A fourth press that moves nothing is a FAIL, with the landings read.
   The panel is never closed during the walk. Screenshot after the fourth press (`-fourth.png`).
6. A on Undo (if still reachable: Up as needed, reading focus) so the mark is taken back; `cat
   ~/homebrew/settings/bonsAI/rag_demote.json` must show no entry for the note. Exit the game with `deck_exitGame`;
   confirm its process is gone; `free -m`.

## R1.5: the look check and the sweep (rows QA-LOOK-01-p102 and P102-R1-SWEEP)

Nothing running: the look check on Main with the R1.1 answer's notes block on screen (nothing pressed against the
right edge, cut off or overlapping; screenshot `-look.png`). Then the free-play sweep on Main with nothing running, and
again with Deep Rock Galactic: Survivor running (launch as in R1.4 step 1; exit afterwards): no stop twice, no lost
ring; record the stop counts.

## R1.6: the picture names the running game (row P102-PICTURE-01, lane D; only if a shape landed)

Only if the session's facts say lane D landed a shape. God of War running (unload the AI first; launch; 30 seconds in
front): take a screenshot with the Deck's own capture (Steam + R1), open the plugin, attach the newest screenshot with the
paperclip in the question strip (read focus on the paperclip, A, pick the newest), then "what game is this and where am
I" with the send-question script (the attachment stays). **Pass when** the reply names God of War, two tries differently
worded ("which game is this screenshot from and what is happening" the second time). Exit the game; confirm.

## R1.7: handover (`102-handover-R1.md`)

The mode chip back to Speed; `spoiler_tier` default; "Show Developer tab" back to what R1.0 found; no game running; the
models unloaded; the keep-awake held or released as the session says. The handover: the build hash, the installed
library's version and size (block RR puts the published one back), each row's verdict in one line with its evidence
file, and anything that surprised you.
