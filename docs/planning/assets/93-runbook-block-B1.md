# Plan 93, Deck block B1: the long-answer measurements and Terse (2026-10-13 night)

Read the previous driver's handover first:
`C:\Users\still\AppData\Local\Temp\claude\C--Users-still-Documents-BonsAI\1b82973e-6279-4c90-9e5d-b96bcd14c2e8\scratchpad\driverA\handover-A.md`
(the build on the Deck, which screen, the keep-awake, the backup, the test chat, which AI the Deck uses).
Repo: `C:\Users\still\Documents\BonsAI`. Plan number for evidence: **93**. Your scratch folder (make it):
`...\scratchpad\driverB1\`. Handover at the end: `...\scratchpad\driverB1\handover-B1.md`.
Machine: the real Deck only. No deploy, no reload unless opening fails twice, no game. Never press A on the question
box: questions go in with the send-question script, then walk to Ask and press A there (rule 1). Test questions go
only in the test chat ("How do I beat the Mantis Lords…"); read the open chat's name before every question.
Settings: read keys by name only; note each value you change and put it back at the end (rule 7).
Every check: one evidence file with the standard fields; verdicts start PASS / FAIL / UNCLEAR / COULD NOT RUN; these
are mostly readings, so say exactly what you saw with numbers.

**Which AI answers:** from the handover, the Deck's own AI (Run AI on this Deck on) or a PC on the network. Either is
fine; write which in every evidence file. A long answer from the Deck's own AI can take a minute. If no AI answers at
all, mark the checks COULD NOT RUN with the error line from the plugin log and stop.

**A probe you will need (write it once in your scratch folder, run it as the other probes are run: piped into
`python3 -` on the Deck):** copy the page-connection code from `scripts/probe_deck_ask_caret.py`, and make a probe
that, every 100 ms for up to N seconds, records: the transcript pane's scroll position and scroll height, the
visible window height, whether a live (streaming) answer bubble is present and its text length, whether the rating
buttons (Helpful / Not really) are on the page, the focused element's name and box, and a time stamp. Print the
samples as JSON lines. Test it once on an idle page before using it.

## 1. Terse: how long is a terse answer on the Deck's panel (row P93-M11-TERSE-LINES)

1.1 Read the Ask mode and the Terse switch from the settings file (key names from the handover; values only). The
    maintainer's report was in Speed mode with Terse on. If the mode is not Speed, set it with the mode chip beside
    the question box on the Main tab (A on the chip opens a small list: Speed, Strategy, Expert; Up or Down, read
    focus, A). If Terse is off, switch it on: the Terse mode switch on the Ollama tab, under the Reply style slider
    (that slider is Caveman / Balanced / Detailed and sets how long an answer is; leave it alone). Note both old
    values.
1.2 In the test chat, ask five differently worded Speed questions, one at a time, waiting for each answer to finish
    (the rating buttons appear). Use the send-question script, walk to Ask, read focus, A. Questions (no apostrophes):
    - "What is the fastest way to earn geo early in Hollow Knight"
    - "Which charm should I buy first in Hollow Knight"
    - "How do I open the Crossroads stag station"
    - "Where is the first bench after the Forgotten Crossroads"
    - "What does the Mothwing Cloak let me do"
1.3 For each answer, when it has finished, read: the answer's full text (from the page or the plugin log), the number
    of lines the model wrote (count newline-separated lines in the text), the word count, whether a choice menu
    (buttons) appeared under it, and the rendered height of the answer bubble and its line height (from the probe or
    `deck_readPage` boxes), so the screen lines = height / line height. Screenshot one of them
    (`plan93-M11-TERSE-LINES-q2.png`).
1.4 Put the mode and the switch back to the values from 1.1 if you changed them.
Evidence: `plan93-M11-TERSE-LINES.json` with a row per question: model lines, words, menu yes/no, bubble height,
line height, screen lines. Verdict: a reading (PASS if 4 of 5 are within three model lines, as plan 83 measured;
otherwise say the counts).

## 2. One long answer for the next three checks (setup for 3, 4 and 5)

2.1 Set the Ask mode to Expert with the mode chip beside the question box on Main (note the old value). Make sure
    the Terse switch on the Ollama tab is off (note it). Leave the Reply style slider (Caveman / Balanced / Detailed)
    as it is, and write its position in the evidence.
2.2 Start the probe from check 0 with N = 180 s **before** pressing Ask. Then in the test chat send:
    "Describe every area of Hollow Knight in the order a new player usually reaches them, and for each area say what
    to find there, which enemies are dangerous, and what to do before leaving" (no apostrophes), walk to Ask, read
    focus, A. Let it finish. Keep the probe's output file; it is the evidence for check 3.
2.3 Read the finished answer: its section count (the answer's stops when walking), its total rendered height, and
    whether its own "Show details" line is at the end. If the answer is shorter than two screens (under about 900 px),
    ask one more, longer question ("Now do the same for the late-game areas, in as much detail as you can", no
    apostrophes) and use that one.

## 3. The finish of a streamed answer (row P93-M4-ANSWER-FINISH)

From the probe's samples of check 2.2: find the moment the live bubble disappeared (or the rating buttons appeared).
Report, with time stamps: the scroll position in each 100 ms sample through the last 3 s before that moment and the
2 s after it; the scroll height in the same samples; whether the scroll position moved back to 0 and then to the end
(the "jump"); the largest single change in scroll position between two samples; the focused element before and
after. Also take three screenshots by hand in the last seconds if you can time it (optional).
Verdict: a reading. PASS if the scroll position changed by less than 50 px across the finish and never went to 0;
FAIL with the numbers otherwise.
Evidence: `plan93-M4-ANSWER-FINISH.json` plus the raw samples file beside it (`plan93-M4-ANSWER-FINISH-samples.jsonl`).

## 4. The chips near the end of the answer (row P93-M3-CHIPS-NEAR-END)

The maintainer: scrolled to the end of an answer with the "Show details" line close, the chips above the question box
turn into a "Show details" line (by design), and after moving away the ring can fail to reach the chips.
4.1 With the long answer finished and the ring somewhere in it, press Down one press at a time, reading focus after
    each, until the ring is on the last section of the answer (near its own "Show details" line). After each press
    also read what sits above the question box: the chip row (chip words) or the slot's "Show details" line.
4.2 Round 1: from the last section, Down to the question box (or whatever Down lands on; read it). Then Up: what
    takes the ring (a chip, the slot's line, the answer)? Read focus and its box. Then Up again into the answer, then
    Down back to the box, then Up: what takes the ring now? Record every landing.
4.3 Rounds 2 to 5: the same sequence from different starting points in the answer (two sections up; the top of the
    answer; after pressing B once on the box; after waiting 2 s on the box before Up). Record each landing.
4.4 If at any point Up from the box lands on nothing (no focused element, or the same element as before with no
    ring), that is the bug: record the exact presses before it, what the slot showed, and the two flags if the probe
    can read them (the slot's "shows line" state is visible as which element is drawn above the box).
Verdict: PASS if Up from the box reached a chip or the slot's line in all five rounds; FAIL naming the round and the
presses; UNCLEAR with the landings. Evidence: `plan93-M3-CHIPS-NEAR-END.json`, one entry per round.

## 5. Up skipping a paragraph that Down stops on (row P93-M6-UP-SKIPS-PARAGRAPH)

5.1 From the top of the long answer, Down one press at a time to its end, reading focus after each: the ordered list
    of stops with each stop's box (top, height) and the pane's scroll position.
5.2 Then Up one press at a time back to the top, the same readings.
5.3 Compare: every stop in the Down list that is missing from the Up list, and the reverse, with its height against
    the visible height (454 on the Deck's own screen, minus the dock). A section taller than the visible area may be
    entered from a different edge each way (the tall-section rule); say whether the skipped stop is taller than the
    visible area or not.
Verdict: PASS if the two lists hold the same stops; FAIL naming the skipped stop, its height and the visible height.
Evidence: `plan93-M6-UP-SKIPS-PARAGRAPH.json`. Save the Down walk with `deck_saveCheck` if it passes.

## 6. Put back and hand over

Put the Reply style slider and the Terse switch back to the values you noted. Confirm on the slider. Leave the plugin
open on Main in the test chat. Write `handover-B1.md`: everything the A handover had, plus which AI answered, how long
the long answer took, every setting changed and put back, and the state as you leave it.
