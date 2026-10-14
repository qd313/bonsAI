# Plan 93, Deck block B2: the Search tab ring and Text size on Steam-drawn words

Read the previous handovers first: `...\scratchpad\driverA\handover-A.md` and `...\scratchpad\driverB1\handover-B1.md`
(both under `C:\Users\still\AppData\Local\Temp\claude\C--Users-still-Documents-BonsAI\1b82973e-6279-4c90-9e5d-b96bcd14c2e8\scratchpad\`).
Repo: `C:\Users\still\Documents\BonsAI`. Plan number for evidence: **93**. Your scratch folder (make it):
`...\scratchpad\driverB2\`. Handover at the end: `...\scratchpad\driverB2\handover-B2.md`.
Machine: the real Deck only. No deploy, no reload unless opening fails twice, no game. Never press A on the question
box. Settings: read keys by name only; note each value you change and put it back (rule 7). Test chat as before.

## 1. The Search tab's ring after closing a game note (row P93-M5-SEARCH-RING)

Seen once (plan 92): on the Search tab, after closing a game note with B, the ring vanished when a new word arrived;
one Up brought it back. The likely cause named by the code: a move onto a stop drawn in the same moment.
1.1 Open the Search tab (LB from Main, or Y from the question box). Read the page: the game row, the find box, the
    word buttons, the notes list, the game notes (the knowledge library must be installed; if the tab shows no game
    notes group, say so and run the rounds on a chat match instead).
1.2 Pick a word button that produces a game-note match (walk to a word, read focus, A). Read the results.
1.3 Round 1: walk to a game-note result, read focus, A to open it (a note sheet or an expanded note). Press B to close
    it. **Read focus at once (as fast as the tool allows) and again after 1 s and after 2 s.** Record the focused
    element each time (name and box) and whether Steam's ring is drawn (the probe's "ring owned" reading).
1.4 Rounds 2 to 5: the same with a different result each time, and in rounds 4 and 5 press a second word button
    right after B (within half a second) so new results are drawn while the ring returns.
1.5 If the ring is on nothing after any B: press Up once, read focus, and record that one press brought it back.
Verdict: PASS if the ring was on a stop at every reading in all five rounds; FAIL naming the round, the presses and
the readings. Evidence: `plan93-M5-SEARCH-RING.json`.

## 2. Text size on every tab, three sizes: which words stay the same (row P93-M10-TEXT-SIZE-STEAM-WORDS)

The code says every word the plugin draws scales with the Text size setting, and that the words Steam draws inside
its own controls (section titles, switch labels and their descriptions, the Developer buttons, the About dropdowns)
do not. Measure which words stay fixed, tab by tab, so the people fixing it tomorrow have the list.
2.1 Write a probe (copy the page-connection code from `scripts/probe_deck_ask_caret.py`) that lists, for the
    plugin's panel, every visible text element: its text (first 40 characters), its computed font size in px, and
    its box. Run it on each tab and save the output per tab.
2.2 Read the Text size setting's current value (key name from the settings file; the Settings tab shows it as
    Small / Normal / Large). Note it.
2.3 At the current size, run the probe on every tab: Search, Main, Ollama (every section open), Settings (every
    section open), Permissions, Developer (every section open; skip if the tab is hidden), About. Open each section
    with A on its line; close them again by leaving the tab with LB/RB.
2.4 Set Text size to Small (Settings tab, the Text size row, Left/Right; read the row after each press). Run the
    probe on every tab again. Then Large; run it again.
2.5 Compare per element: the words whose font size is the same at Small and Large are the fixed ones. List them per
    tab with their text and size. Also note, for each tab, how many text elements scaled and how many did not.
2.6 Put Text size back to the value from 2.2 and confirm on the row.
Verdict: a reading. PASS if the only fixed words are Steam-drawn ones (section titles, switch labels and
descriptions, Steam buttons, dropdowns); FAIL naming any word the plugin draws that stayed fixed (compare with the
code reading: the emoticon art and the LB/RB marks are allowed to stay fixed).
Evidence: `plan93-M10-TEXT-SIZE-STEAM-WORDS.json` with the per-tab lists, and the raw probe outputs beside it
(`plan93-M10-<tab>-<size>.json`).

## 3. The Gemma model in the model picker with the policy on open source (row P93-M13b-GEMMA-PICKER)

The maintainer saw gemma4:e2b-it-qat missing from the model picker (the list of installed models a person picks
from) with "Open source only" picked. Block A found the catalog lists it in every state; the picker was not read.
3.1 Read the policy setting (key `model_policy_tier`; block A found `open_weight`). Note it.
3.2 With the policy as found, open every place a model is picked and read the list of names offered: the Ollama
    tab's model row or picker (the control that names the model Ask uses), the try-order list if the tab has one, and
    the "Model" chip under Show details beside an answer if it opens a list. Record each list.
3.3 Set the policy to "Open source only" (the Ollama tab's policy control; Left/Right or a list; read it after each
    press; note the exact label). Open the same pickers again and record each list. Is the Gemma tag offered? Is the
    Qwen vision model offered?
3.4 Put the policy back to the value from 3.1 and confirm it on the control and in the settings file (key name only).
Verdict: PASS if the Gemma tag is offered in every picker under "Open source only"; FAIL naming the picker that hides
it and the names it showed instead. Evidence: `plan93-M13b-GEMMA-PICKER.json` with a screenshot per picker.

## 4. Hand over

Put back every setting you changed (Text size). Leave the plugin open on Main in the test chat. Write
`handover-B2.md` as the earlier handovers.
