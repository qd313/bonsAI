# Plan 97, Deck block G: the freeze's third try and the answer height's third try

For a fresh deck-driver helper after block F (read `97-handover-F.md` first). Same rules, evidence folder and naming
(`plan97-<ROW>-try3.json`). One press per call, about a second apart. Never reload the plugin with a game running.

## G0: deploy

Renew the keep-awake if under 3 hours remain; record the old bundle hash; `deck_deploy` the shared checkout's tip
(record the tip); read the new hash; open the plugin (read the page before any A). Row **P97-G-DEPLOY**.

## G1: the answer's height, third try (row P97-L4-ANSWER-DIPS-try3), no game

Block F's sampler and its two questions, scramble ON (default style). **Pass:** no rise above the final height and no
fall over 2 px while writing (about 3 px right after a heading line is known); frame rate in the last 3 s recorded.

## G2: the freeze, third try, gated (rows P97-L14-FREEZE-try3, P97-L14-SECTIONS-try2)

Unload the Deck's AI first (block B's runbook B0), launch Deep Rock Galactic: Survivor, wait 30 s, then reach the
lost-focus state as in block E (paperclip → "Close menu & take screenshot" → wait 3 s → chord; fallback "Delete
chat?" → B) until the Quick Access page reads `document.hasFocus()` false. Ask one short question first if the chat's
newest turn has no answer with Show reasoning. Then, in one spell, reading focus and `hasFocus` after every press:

1. From the question box: Up, Up, Up ... until the question is reached, recording each landing (expected: chips →
   notes block → Show details → Helpful → each answer section bottom to top → Show reasoning → question). Then Down
   back to Show details. **Pass:** every press moved the ring while `hasFocus` read false; no stop visited twice.
2. Left from the box lands on the paperclip; Right from the box lands on the mode button; three times each.
3. On a chip: Left and Right move one chip each.
4. Settings, Ollama (AI connection) and Developer tabs: open one section on each, press Down on its line (lands inside
   the section), three times on Settings' Data line.
5. Grep the plugin log for `dpad.lostFocusHop` and copy the lines (judge by the screen, not by the `followed` field,
   which is read too early).

If the lost-focus state is not reached in six tries: UNCLEAR. Then exit the game (confirm the process is gone over
SSH), and run the same walk once with focus present and no game as the control.

## G3: the end

Every setting as found (mode chip Strategy, Text size Small, "Run AI on this Deck" ON, scramble on), the game closed,
the plugin open on Main in the test chat, the Deck's AI not reloaded on purpose. Handover `97-handover-G.md`.
