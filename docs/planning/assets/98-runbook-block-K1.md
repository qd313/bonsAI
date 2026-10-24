# Plan 98, Deck block K1: one check per landed feature

For a fresh deck-driver helper, after the session has deployed tonight's build with `scripts/build.ps1` (the session
gives the commit and the dist hash). Read first: the K0 and K2 handovers (paths in your task), then this page. The
rules of your helper file apply in full. Every Deck command is exactly `ssh deck@192.168.86.52 '<command>'`. Evidence
`C:\Users\still\Documents\bonsAI-workshop\test-evidence\plan98-<ROW>.json`, one file per check, never overwritten
(`-try2`). Saved walks: `checksDir` = `C:\Users\still\Documents\bonsAI-workshop\checks`. About fifteen checks; the
order is the order of importance, so if a later step is refused or your memory runs low, the important ones are done.

**The test chat** is the one K0 made (saved id `fc3c35c7`, named after its first question, "In Hollow Knight, how do I
beat the Mantis Lords"). Read the open chat's name before every question; never ask in another chat. **Questions** go
in with the send-question script on the Main tab only, then a walk to Ask and A as its own step; never A on the
question box; no apostrophes. Every question here is worded once; never repeat one word for word (the answer cache).
**Unload the Deck's AI before any game launch; never reload the plugin with a game running.** Settings: print key
names only, except the keys this page names (`spoiler_tier`, `rag_corpus_version`, `rag_corpus_path`).

## K1.0: setup (row P98-K1-SETUP)

1. `deck_status` (lease free, stop switch off); renew the keep-awake (480 min); which screen is live.
2. The build: `sha256sum ~/homebrew/plugins/bonsAI/dist/index.js | cut -c1-12` must equal the hash in your task.
   Open the plugin (the first open after a deploy may fail once).
3. The seed folder: `python3 -c "import json;print(json.load(open('/home/deck/homebrew/settings/bonsAI/seed-knowledge-base/corpus-manifest.json'))['version'])"`
   (expect 2026.10.24); the installed library's version and place (keys `rag_corpus_version`, `rag_corpus_path`).
4. Whether the thumbs-down store exists yet: `ls -l ~/homebrew/settings/bonsAI/rag_demote.json` (expect: no such
   file). Write the answer in the handover; K1.4 and the end of this block depend on it.
5. The mode chip reads Strategy (K0 left it there). The Developer tab: read whether it shows; if not, Settings →
   Data → the Developer tab switch on (note it for the handover).

## K1.1: install the test library, and the "newer than published" wording (row P97-L9-KB-UPDATE)

1. Developer tab → walk to "Install seed knowledge base" (read focus) → A. Wait for the status to settle (up to 60 s).
   Read `rag_corpus_version` and `rag_corpus_path` and the library's file dates: the installed version is now the
   seed's (2026.10.24).
2. Ollama tab → the knowledge base rows → walk to "Update knowledge base" (read focus; it sits beside Remove) → A.
   Within 10 s read the row's status line and `grep -i "installed=.*newest=" ~/homebrew/logs/bonsAI/*.log | tail -2`
   (or the plugin_loader journal if that log is empty).
3. **Pass when:** the line reads "You have 2026.10.24; the published library is 2026.10.17. Nothing to do." (the
   exact words may differ slightly; record them whole), the status stays Installed, the file dates do not change, and
   the log names both versions. Leave the seed installed for the rest of tonight.

## K1.2: tap-to-define words in other games (row P98-GLOSSARY-02)

Nothing running. Main tab, Strategy, the test chat.
1. "In Hollow Knight, what does the Mothwing Cloak do and how do charms work". **Pass when:** the answer draws at least
   one underlined word (record which); walking to one and pressing A opens its peek (record the peek text); B closes it
   with the ring back on the word. Screenshot with the peek open.
2. Replay the saved walk `P86-GLOSSARY-WALK` with `deck_replayChecks` (it was saved on Deep Rock Galactic: Survivor's
   words; if it no longer matches because the answer differs, record UNCLEAR with why, not FAIL).
3. "In Super Mario 64, how do the Wing Cap and the triple jump work together". **Pass when:** at least one underlined
   word (Wing Cap, triple jump, power meter...); A opens its peek; B closes it. This proves a game with no Steam id.

## K1.3: the route look (row P98-ROUTE-01)

Nothing running. "In Hollow Knight, how do I get to the first boss from the start of the game". If the answer writes a
checklist of three or more steps: **pass when** it draws as a line of dots: step 1 open, later steps covered with a
hatched dot, "Step N" in bold, "A shows this step" on the first covered step and "Covered" on the later ones; Down
from the answer's last paragraph walks the steps one by one (record each stop's name and that each is on screen, not
behind the dock) and then leaves to the rating row; A on the first covered step shows its words and does NOT tick it;
A on a later covered step changes nothing; A on an open step ticks it; close and reopen Quick Access: the tick and the
shown step are still there. Save the walk with `deck_saveCheck` as `P98-ROUTE-01`. If the answer has no checklist or
fewer than three steps, try once more with "In Hollow Knight, list the steps to reach Greenpath from Dirtmouth"; if
still none, UNCLEAR with what the AI wrote. Screenshot the route once with step 1 open and the rest covered.

## K1.4: the thumbs-down that stops a wrong note coming back (row P98-DEMOTE-01)

1. Unload the Deck's AI; launch Deep Rock Galactic: Survivor; wait 30 s with its window in front; reopen Quick
   Access; the Context line names the game.
2. "how do I beat the glyphid dreadnought in this run". Read Show details' notes (expect two or three, e.g. Glyphid
   Dreadnought, Dreadnought Twins, Exploder) and the log's attach line (copy it whole).
3. Walk to Not really (read focus) → A. **Pass when** three new reasons show after the five: Wrong tip, Outdated,
   Wrong edition. Walk to Wrong tip → A. With two or more notes, a "Which note was it?" column shows each note's name
   and "Both of them" or "All of them". Walk to the FIRST note's name → A. **Pass when** the line "Marked not helpful"
   with Undo beside it shows, and a gold line names that note ("... will rank lower for questions like this"). Record
   every stop's name after every press. Read `cat ~/homebrew/settings/bonsAI/rag_demote.json` (this file holds no
   secrets): one entry, one down, reason wrong_tip.
4. A second, differently worded question: "what is the best way to kill the dreadnought here". **Pass when** the
   marked note is no longer first in Show details' notes (or is absent), and, if it is listed, the open notes block
   tags it "ranked lower by you". Copy the attach line (it now carries `demoted=`).
5. Undo: open "N earlier", find the first answer, walk to its Undo → A. If Undo cannot be reached there, record that
   (UNCLEAR for the undo half) and go to step 6 anyway. Read the store file again: no entry, or zero downs.
6. Only if K1.0 found NO `rag_demote.json` and Undo could not clear it: remove the file this test created,
   `rm ~/homebrew/settings/bonsAI/rag_demote.json`, and say so in `side_effect`. If the permission check refuses that,
   stop and report; never look for another way.
7. A third question: "which weapon handles the dreadnought best". **Pass when** the note is listed as before (first,
   or where it was in step 2). Exit the game; confirm the process is gone (bracketed pattern); `free -m`.

## K1.5: the spoiler setting (row P98-SPOILER-TIER)

Nothing running.
1. Settings → Story spoilers (open the section) → walk Down to the "How much to hide" row (read focus at each press).
   **Pass when** Left and Right move across Hide more, Default, Hide less (record the stop names), and A saves the
   one under the ring. Set Hide more. Close and reopen Quick Access; read the key `spoiler_tier` (expect `strict`).
   Also press Up from the line below the section into it and record where the ring lands.
2. Main tab: "In Hades, what is the hardest fight at the end of the first region and how do I win it" (it names no
   boss). Read the answer every 250 ms from the Ask press until it finishes: **pass when** at least one spoiler cover
   is drawn (count them).
3. Settings → set Hide less; reopen; `spoiler_tier` reads `open`. "In Hades, who waits at the end of Tartarus and what
   are her attacks" (also names no boss). **Pass when** no cover is drawn at any read and Show details' spoiler chip
   reads low.
4. Put the row back to Default; reopen; `spoiler_tier` reads `default`.

## K1.6: saved walks and the look (rows P98-K1-REPLAYS, QA-LOOK-01)

1. `deck_replayChecks` on the knowledge-base walks in the checks folder (names containing GLOSSARY, KB, NOTES) and
   `P86-DEVELOPER-WALK`: record each as passed, failed (where it went instead) or stale (the screen it expects is
   gone).
2. The look check on the Settings tab (the Story spoilers section open) and on Main with a rated-down reply showing:
   `ssh deck@192.168.86.52 'python3 -' < C:\Users\still\Documents\BonsAI\scripts\probe_deck_ui_look.py` the way its
   header says; one screenshot of each. Record anything pressed against the right edge, cut off, or overlapping.

## K1.7: handover

`98-handover-K1.md` in the scratch folder: the build, the keep-awake expiry, the test chat's name now, the library
installed (the seed, 2026.10.24) and where, whether `rag_demote.json` exists now and what it holds, every setting you
changed and whether it is back (the spoiler row must be Default; the Developer tab switch), the Deck's state, anything
odd.
