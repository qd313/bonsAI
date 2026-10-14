# Plan 93, Deck block C: the owed checks the rig can reach (for the morning chat, 2026-10-14)

Written 2026-10-13 by the planning chat for the Opus chat that runs plan 93. Two parts, one driver each (a fresh
`deck-driver` per part, Sonnet medium). Read the block A and B1 handovers first (`93-handover-A.md`,
`93-handover-B1.md` beside this file). Repo `C:\Users\still\Documents\BonsAI`; plan number **93**; evidence
`docs/test-evidence/plan93-<ROW>.json` (list the folder first, never overwrite). The Deck's own screen (854 x 454).
Every Deck command exactly `ssh deck@192.168.86.52 '<command>'`. Never press A on the question box. Settings by key
name only; note and restore every value changed. The test chat is the one block B1 made (its name is in the B1
handover); if it is gone, make a new one with New chat and say so.

## Part 1 (about 15 checks): the walks on the Deck's own screen, the settings pages, the sweep

### C1. Settings and Developer walks on the Deck's own screen (row P89-TAB-WALK, re-run on the own screen)

The plan 89 fix was measured on the monitor only; the maintainer's own look is still owed, and this run gives the
own-screen numbers. Rule from plan 89: the page stays still while the control is inside Steam's comfortable band, and
turns by one step of under half the pane (under 227 px here) when the control leaves it; no jump at the end; no creep
afterwards; every stop visible. The maintainer's call 20 (D128): the page moving on every second press is fine.
1. Settings tab, every section open (the floating Open all button). From the tab bar, Down one press at a time to the
   last control, reading focus and the pane's scroll position after each press; then Up back to the top the same way.
   Record per press: the stop, its box, the scroll position, the change in px. Count presses that moved the page and
   the largest move. Then Down to the Text size row and press Left, Right, Right, Left: the scroll change per press
   must be 0; the choice must end where it started.
2. Developer tab (skip with a note if it is hidden), every section open, the same walk and readings.
Verdict per tab: PASS if no move is 227 px or more, no jump at the end, no creep, every stop visible, and Text size's
Left/Right move the page 0 px; FAIL with the numbers. Evidence `plan93-P89-TAB-WALK-OWN-SCREEN-SETTINGS.json`, `-DEVELOPER.json`.

### C2. The 24 Steam settings pages from the Search tab (row P90-SEARCH-SETTINGS)

Since plan 92 the Steam settings search lives on the Search tab. Plan 89 proved 22 of 24 pages by their links and the
two broken ones by the fix (row STEAM-SETTINGS-PAGES-01); this run proves the route from the new tab.
1. Search tab. Use the word buttons or the find box to reach the settings results (the group of Steam settings the
   plugin can open; if typing is needed, type with the send-question script's method only if the runbook owner has
   said it is safe for that box; otherwise use the word buttons and say so).
2. For each settings result in turn: walk to it, read focus, A. Read the title of the Steam page that opened (the page
   name in the Steam Big Picture Mode page). B (or the back route the handover names) to return to the plugin. Record
   result name, page title, pass or not. Expected: each opens its own page; Internet opens the Internet page; Remote
   Play opens by Decky's own route.
Verdict: PASS if all 24 open their own page; FAIL naming each that did not. Evidence `plan93-P90-SEARCH-SETTINGS.json`.

### C3. The free-play sweep without a game (row QA-FREE-PLAY-01, the "before" picture for tomorrow's fixes)

Main tab, the test chat open, `deck_sweep` from the tab bar through the whole pane; every focused stop must also be
visible (box against the visible area and the dock); no loop; no dead press. Save it. Evidence
`plan93-QA-FREE-PLAY-01-before.json`.

## Part 2 (about 10 checks): the knowledge library out and back, and the notes block with a game

### C4. The knowledge library removed through the plugin and installed again (row P90-SEARCH-KB)

Owed from plan 92. **This is the one check where A on a Remove box's action is allowed, and only here.**
1. Before: the Ollama tab's knowledge base section shows the library installed (its version line; record it). The
   Search tab shows a game-notes group when a word is picked (record a word and the count).
2. Remove: the knowledge base section, Remove, read focus, A; the box; walk to its Remove action, read focus, A.
   Wait for the section to say the library is absent. Record the section's words.
3. Search tab: pick the same word; the game-notes group must be gone (no game notes listed); the other groups still
   work. Record.
4. Install again **by the plugin's own Download button** in the knowledge base section (Internet downloads is on;
   the box may or may not show, see plan 93 call 12). Wait for the version line to come back and record it; it must
   match the version from step 1. If the download fails, say exactly what the screen said, and only then use the
   Developer tab's "Install seed knowledge base" button, and say that the library on the Deck is now the seed, not
   the published one.
5. Search tab: the same word; the game-notes group is back with the same count. Record.
Verdict: PASS if steps 3 and 5 both read as expected and the version matches; FAIL otherwise. Evidence
`plan93-P90-SEARCH-KB.json`.

### C5. The notes block with a game running and no matching note (row NOTES-BLOCK-04, the game half)

Owed since 2026-10-03; two earlier tries with a game attached notes both times. Two differently worded questions,
no third. **Unload the Deck's AI first** (`ssh deck@192.168.86.52 'ollama ps'`, then stop any loaded model with
`ollama stop <name>`), check `free -m` shows over 2,000 MB available, then launch a game from Recent Games with
the rig's launcher (block A's setup file lists what is on the row; Deep Rock Galactic: Survivor if present). Wait
for the game's window to be in front for 30 s, open Quick Access, the plugin, confirm the Context line names the game.
1. In the test chat, ask (send-question script, walk to Ask, read focus, A): "How do I buy a house in this game"
   (no apostrophes). Wait for the answer. Read: whether a "From the notes" block is drawn under it, and whether the
   "No close match" line shows. Expected: no block, the line shows.
2. Second wording: "Who is the final boss called Zorblax" (a boss that does not exist). Same readings.
3. Close the game over SSH and confirm its process is gone. Confirm no model is loaded (`ollama ps`).
Verdict: PASS if both answers show the line and no block; FAIL if a block was attached (say what note); UNCLEAR if
the AI's answer prevented a reading. Evidence `plan93-NOTES-BLOCK-04-game.json`.

## Hand over

Put back every setting changed. No game running, no model loaded. The plugin open on Main in the test chat. The
handover note beside the evidence in the scratch folder of the chat that ran it, with everything the earlier
handovers carried.
