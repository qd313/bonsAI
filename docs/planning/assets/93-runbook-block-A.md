# Plan 93, Deck block A: setup and the cheap readings (2026-10-13 evening)

Repo: `C:\Users\still\Documents\BonsAI` (branch `experimental`, tip `c7c85259`; the code on the Deck should be plan
92's last build `e6afe2bd`, which has the same code: everything since is documents only).
Plan number for evidence files: **93** (`docs/test-evidence/plan93-<ROW>.json`). Scratch folder for your own files:
`C:\Users\still\AppData\Local\Temp\claude\C--Users-still-Documents-BonsAI\1b82973e-6279-4c90-9e5d-b96bcd14c2e8\scratchpad\driverA\`
(make it). Handover note at the end: `...\scratchpad\driverA\handover-A.md`.
Machine: the real Deck (`machine: "deck"`, 192.168.86.52). **Do not deploy** unless check 0.4 says the build differs.
**Do not reload the plugin** unless opening it fails twice. No game tonight. Never press A on the question box.
**Test chat:** the plan 92 test chat whose name starts "How do I beat the Mantis Lords" (Hollow Knight). If it is not
there, stop and report before any question. No questions are needed in this block anyway.
**Settings file:** read it by key name only. Never print the whole file (it holds the Steam Web API key). The one value
you may print is the internet-downloads switch (check 5).

Every check: one evidence file, fields `row`, `build_commit`, `deck_time_local`, `screen`, `setup`, `pressed`, `seen`,
`expected`, `verdict` (starts PASS / FAIL / UNCLEAR / COULD NOT RUN), `side_effect`. Numbers, not adjectives.
These are measurements, so most verdicts will read "UNCLEAR" or a plain reading; that is fine. Say what you saw.

## 0. Setup (row P93-SETUP)

0.1 `deck_status` and `deck_automationStatus`: the rig armed, no lease held by another process. If another chat holds
    a lease or focus moves on its own at any point, stop and report.
0.2 `deck_holdAwake` with `ttlMinutes: 480`; record `expiresAt`.
0.3 Which screen is live: open the plugin (`deck_openPlugin`; one failure after a reload is normal) and read the page
    window size with `deck_readPage` or a probe. 854 x 454 is the Deck's own screen; 855 x 766 is the monitor. Write
    it in every evidence file.
0.4 The build: `ssh deck@192.168.86.52 'cat ~/homebrew/plugins/bonsAI/dist/index.js | head -c 400'` is not useful;
    instead run `deck_checkReady` with `buildMatches: true`, `machineKind: "deck"`, `awake: true`. Record the result.
    If the build does not match the local tip, report it and continue without deploying (the code is the same; only
    documents changed since the Deck's build).
0.5 Back up: `ssh deck@192.168.86.52 'mkdir -p ~/p93-backup && cp ~/homebrew/settings/bonsAI/settings.json ~/p93-backup/settings.json && ls ~/homebrew/settings/bonsAI/ && cp -r ~/homebrew/settings/bonsAI/chats ~/p93-backup/chats 2>/dev/null; ls -la ~/p93-backup'`
    (if the chats live somewhere else, list the settings folder and copy whatever holds the saved chats; say what you
    copied).
0.6 Ollama: `ssh deck@192.168.86.52 'ollama list | awk "{print \$1}"; ollama ps | awk "{print \$1}"'`: the model names
    installed (names only) and whether any is loaded. Also read these settings keys by name and print only their
    values: `ollama_local_on_deck`, `model_policy_tier`, the Ask-mode key (search the file for `ask_mode` or
    `reply_style`; print the key name you found and its value), and `terse_mode`.
    Example: `ssh deck@192.168.86.52 'python3 -c "import json;d=json.load(open(\"/home/deck/homebrew/settings/bonsAI/settings.json\"));print({k:d.get(k) for k in [\"ollama_local_on_deck\",\"model_policy_tier\",\"terse_mode\"]})"'`
0.7 Chats: open the chats menu from Main (the chat's name row, then the menu) and read the chat names; confirm the
    test chat is there; count the chats. Close the menu with B.
0.8 Parental lock: the Permissions tab shows no lock banner. Test chips: the Main tab's chip row shows ordinary
    chips (not a pinned test batch). Which games are on Recent Games (Steam Home, read the row's names; do not
    launch anything).
Evidence: `plan93-P93-SETUP.json` with all of the above.

## 1. The Gemma model and the licence filter (row P93-M13-GEMMA-FILTER)  — the maintainer asked for this one by name

The maintainer believes `gemma4:e2b-it-qat` disappears from the AI models list when the licence filter is on
"Open source only". The code says the model is labelled open source. Find out what the screen does.
1.1 From check 0.6 you know the exact installed model names on the Deck. Write them in the evidence.
1.2 Ollama tab → open the "Where the AI runs" section if folded → the "Browse models" button (A on it) opens the
    AI models box. **Walk this box one press at a time and read focus after every press. Never press A on a model
    row.** Read the whole box with `deck_readPage`: the filters column (the licence choices and which is picked, the
    "Deck essentials only" tick and whether it is ticked, the "Good for" ticks), and every row in the list: model
    name, its licence pill text, and whether it reads installed.
1.3 Set the licence pick to "Open source only" (if it is not already): walk to it, A. Read the rows again (names
    and pills). Is `gemma4:e2b-it-qat` (or whatever Gemma tag check 1.1 found installed) in the list?
1.4 Untick "Deck essentials only" (walk to it, A). Read the rows again. Is the Gemma tag there now?
1.5 Set the licence pick to the Tier 2 choice (open-weight). Read the rows again. Is the Gemma tag there?
1.6 Put every filter back exactly as you found it in 1.2 (the licence pick, the essentials tick). Read once more to
    confirm. Close the box with B (B is known to not close it on one sighting; if B does nothing, walk to Done and A).
Expected: the Gemma tag is listed under "Open source only" with an open-source pill. Record exactly which filter state
shows it and which hides it. Verdict: PASS if it shows under Open source only with the essentials tick as found; FAIL
if it is hidden under Open source only and shows under Tier 2; UNCLEAR otherwise, with the lists.

## 2. The question box's hint in each Ask mode (row P93-M12-ASK-HINTS)

The code shows a grey hint inside the empty question box only in Strategy mode. Read what the Deck shows in each.
2.1 Read the Ask mode's current value (check 0.6's key). Note it; you will put it back.
2.2 Main tab, question box empty (if it holds text, do not press A; use Clear if a Clear control exists, else report).
    Read the box's hint text: `deck_readPage` on the box (the textarea's placeholder) or
    `scripts/probe_deck_*.py` if one reads attributes. Take a screenshot (`scripts/screenshot-deck.ps1` if the rig's
    capture tool fails) named `plan93-M12-ASK-HINTS-<mode>.png`.
2.3 Change the mode: **the mode chip beside the question box on the Main tab** (it reads Speed, Strategy or
    Expert). Walk to it, read focus, press A: a small list opens above it with the three modes; Up or Down to one,
    read focus, A. (Not the Ollama tab's Reply style slider: that one is Caveman / Balanced / Detailed and sets how
    long an answer is.) Set each of the three in turn, read the empty box's hint, screenshot.
2.4 Put the mode back to the value from 2.1 and confirm it on the slider.
Expected: a hint in Strategy only; Speed and Expert empty. Record the exact hint words. Verdict: a plain reading
(PASS if it matches the code reading; otherwise say what showed).

## 3. The folded tabs' ring with sections open (row P93-M1-FOLDED-RING)

The maintainer saw: after opening some sections and walking with the D-pad, "Terse mode" could not take the ring; and
on Developer, the details line under "Tab to open" appeared on a press, not when the ring landed. Measure, do not fix.
3.1 Ollama tab, every section closed (arrive from another tab with LB/RB; that closes them). Walk Down from the first
    section line to the last, one press at a time, reading focus (name and box) after each press; then open only the
    Reply section (A on its line), walk Down into it one press at a time: list every stop's name and box. Is "Terse
    mode" (a switch) a stop? Note what the press before and after it lands on. Then Up back to the section line.
3.2 Now open every section on Ollama (A on each line, top to bottom). From the top, Down one press at a time to the
    very end, reading focus after each press (name, box, and the pane's scroll position). Then Up one press at a time
    back to the top. Record: the ordered list of stops both ways, any press that moved nothing (a dead press), any
    stop visited twice in a row, and whether "Terse mode" took the ring on the way down and on the way up.
    Stop the walk if a press loops (the same two stops alternating three times) and say so.
3.3 Developer tab (it may be hidden unless Developer mode is on; if the tab is not there, say so and skip 3.3). Every
    section closed; open the section that holds "Tab to open". Walk to the "Tab to open" row. Read the strip text (the
    help line at the bottom of the tabs box) **right after landing**, then wait 1.5 s and read it again. Note the
    row's current text (which tab it names). Press A once; read the strip text and the row's text again. If the row's
    text changed, press A until it reads what it did before, confirming after each press. Record each reading.
3.4 Settings tab: every section open; Down to the end and Up to the top, one press at a time, reading focus after
    each (name, box, scroll position). Record stops, dead presses, loops.
Expected: no dead press, no loop, Terse mode a stop both ways, the strip text present right after landing. Verdict
per tab: PASS if so; FAIL naming the press and the stop; UNCLEAR with the lists.
Evidence: one file per tab: `plan93-M1-FOLDED-RING-OLLAMA.json`, `-DEVELOPER.json`, `-SETTINGS.json`.
Save each walk that passes with `deck_saveCheck` named after its row.

## 4. The Open all button (row P93-M2-OPEN-ALL)

4.1 Ollama tab, every section closed, ring on the **last** section line. Press Down: read focus (expected by the code:
    the ring holds still). Press Right: read focus (expected: the floating "Open all" button).
4.2 With the ring on the button, read the button's box and the tab bar's box (the row of tab icons at the top of the
    pane) on this screen. Do they overlap? By how many px? Also read the box of the strip (the help line) and whether
    the button covers any list row's words. Screenshot `plan93-M2-OPEN-ALL.png`.
4.3 Press A on the button (it opens every section), read focus; press Right from a middle section line now that the
    pane is longer and scrolled: read the button's box again (does it move with the scroll, or stay fixed?).
4.4 Press the button's counterpart to close all (A again if it reads "Close all"), or arrive from another tab with
    LB/RB to close everything. Confirm all sections closed.
Expected: a reading. Verdict: PASS if the button overlaps nothing and is reached by Right only, as the code says;
FAIL naming the overlap in px.

## 5. The confirm boxes: how many buttons (row P93-M9-CONFIRM-BOXES)

Open each box, read it, close it with B. **Never press A on the action button in any of these boxes.** If B does
not close a box, walk to its Cancel (or "Keep …" / "Not now") and press A there, reading focus first.
5.1 Settings tab → the data section (open it) → "Clear cache": A opens its box. Read: title, text, every button's
    label in order, which button holds the ring. Screenshot. B.
5.2 Same section → "Clear all plugin data" (the Clear data button): A opens its box. Same readings. B. **Do not confirm.**
5.3 Read the internet-downloads switch's value from the settings file (its key name has "download" in it; print the
    key name and the value only). Ollama tab → "Where the AI runs" section → "Update AI & models" (or "Install Ollama"
    if that is what the button reads): A. A box should appear ("Turn on internet downloads?" when downloads are off,
    "Download from the internet?" when on). Read the title, text, buttons, ring. B. If instead an update starts with
    no box, press nothing more, read the screen and report it as a side effect (the plan 89 run shows the box comes
    first).
5.4 Ollama tab → the knowledge base section → "Remove" (the library's Remove button): A. Read the box. B. **Do not
    confirm.**
5.5 Main tab → the chat's name row → the chats menu → "Delete chat" with the test chat open: A opens "Delete chat?".
    Read it (this is the model the others will copy): title, text, buttons, ring. B. **Do not confirm.**
Expected: 5.1 to 5.4 show three buttons each (a safe choice, the action, Cancel); 5.5 shows two (Cancel, Delete) on
one row with the ring on Cancel. Verdict: a reading; PASS if the counts match the code reading, with every label
written out.
Evidence: `plan93-M9-CONFIRM-BOXES.json` (one file, five sub-readings each with its own verdict line) and the
screenshots `plan93-M9-CONFIRM-<name>.png`.

## 6. Handover

Write `handover-A.md`: the build on the Deck, which screen, when the keep-awake runs out, where the backup is, the
test chat's name, every setting you changed and whether it is back (the Ask mode, the model filters, Tab to open),
the Deck's state as you leave it (plugin open on which tab, no game, no model loaded), and anything the next driver
should know. Leave the plugin open on the Main tab.
