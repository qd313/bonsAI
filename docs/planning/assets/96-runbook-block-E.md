# Plan 96, Deck block E: the first-run popup, and whatever block D left

For a fresh deck-driver helper, after block D (read `96-handover-D.md`, and the M and V handovers it points to).
Same rules as the earlier blocks (evidence to the workshop as `plan96-<ROW>.json`, never overwritten; every Deck
command exactly `ssh deck@192.168.86.52 '<command>'`; stop if the lease is held by another chat or focus moves without
your press). The session deploys the build that holds the popup and names its commit in your task; do not deploy.

## E1: the first-run popup (row P96-N1-FIRST-RUN-POPUP)

Why: a new player used to find the Ollama tab on their own. Now, right after the Beta Notice, a popup asks where the AI
should run (the maintainer's call, 2026-10-17). The TRUE first run (Clear all data) also deletes the Deck's Ollama and its
models, so that run is release day's clean-install row. Tonight the screen's first run is made the way lane N3 proved:
with the settings file missing, the plugin clears its own "already seen" flags and shows the notices.

Setup: no game. Back up and remove the settings file:
`ssh deck@192.168.86.52 'cp ~/homebrew/settings/bonsAI/settings.json ~/p96-settings.json.bak && rm ~/homebrew/settings/bonsAI/settings.json'`
(if refused by the permission check, record COULD NOT RUN and skip to E2). Reload the plugin; open it (the first open may
fail once).

| Step | Do | Pass when |
|---|---|---|
| 1 | Read the screen. | The Beta Notice shows (one "Got it"). Read focus: the ring is on Got it. A. |
| 2 | Read the screen within 3 s. | The popup "Where should the AI run?" shows; read its text (the lead, the "Run AI on this Deck" switch ON with its help line, "Start the AI with the Deck", the status line "Local Ollama setup: Installed (N models)" since Ollama is installed on this Deck, the note about 4.6 GB, and the foot "Not now" and "Update AI & models"). Read focus: the ring is on **Not now**. Take a screenshot. |
| 3 | Walk: Up (read focus), Up, Up, then Down, Down, Down; Left and Right on the foot row; Left/Right on a switch. | Up from Not now lands on "Start the AI with the Deck", then "Run AI on this Deck", then holds still. Down walks back to Not now. Right from Not now lands on the action button, Left comes back; the ends hold still. Left/Right on a switch hold still. Every stop reports focus; no press is dead. |
| 4 | On "Run AI on this Deck": A (switch off). Read the screen and the settings file (`grep ollama_local_on_deck ~/homebrew/settings/bonsAI/settings.json`). | The popup now shows the PC address field and the foot "Not now" / "Test connection"; the file says false (saved at once). Down from the switch lands on the address field (read focus; do NOT press A on it); Down lands on Not now. A on "Run AI on this Deck" again: back on, the file says true. |
| 5 | On the foot: walk to "Update AI & models" (read focus). Do NOT press A (it would re-download Ollama). Walk to Not now (read focus), A. | The popup closes; Main shows with the help chip; nothing changed in the settings file beyond the switch flips you made. Read focus after: where is the ring (record; the chips or the tab bar are both fine). |
| 6 | Close Quick Access and reopen; open the plugin. | No notice and no popup come back. The Ollama tab still shows the "Where the AI runs" section as before. |
| 7 | The old "Local runtime (beta)" notice. | It never showed at any step (record). |

Put back: `ssh deck@192.168.86.52 'cp ~/p96-settings.json.bak ~/homebrew/settings/bonsAI/settings.json'`, reload the
plugin, open: no notice; read `ollama_local_on_deck` (true) and two other keys you noted before the rm.

Verdict: PASS only if steps 1 to 7 all pass; otherwise FAIL with the step and what was seen. One extra try if a step
looks like a timing slip (a read taken too early).

## E2: whatever block D's handover lists as not run or UNCLEAR

Run those rows from `96-runbook-block-D.md` as written, one evidence file each (`-try2` names).

## E3: the end

Free-play sweep on Main with no game (two walks). Put back every setting (read the file). Plugin on Main in the test
chat, no game, keep-awake left as it is. Handover to `docs/planning/assets/96-handover-E.md`.
