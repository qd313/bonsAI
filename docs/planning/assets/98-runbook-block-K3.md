# Plan 98, Deck block K3: why the AI stalls with a game running, then the second rounds

For a fresh deck-driver helper, on the build already on the Deck (`913b58cf`, dist `9a9b23f5320d`; no deploy). Read
first: the K1 handover (the session gives its path), then this page. The rules of your helper file apply in full.
Every Deck command is exactly `ssh deck@192.168.86.52 '<command>'`. Evidence `plan98-<ROW>.json` in the workshop's
`test-evidence` folder, never overwritten (`-try2`). The test chat only. **`deck_replayChecks` is NOT used in this
block** (the K1 driver replayed all 100 saved walks by leaving out the name filter). Questions without apostrophes,
each worded once.

## K3.0: setup (row P98-K3-SETUP)

`deck_status`; renew the keep-awake (480 min); the screen; the build hash; no game running; the AI unloaded; `free -m`.

## K3.1: the answer time with and without a game (row P98-GAME-ANSWER-TIME, MEASURED)

In block K0 (17:05, the release build) the Deck's AI answered Strategy questions with Deep Rock Galactic: Survivor
running. In block K1 (19:30, tonight's build) it gave no first word within 180 s, four times, with the same game on
its title screen (GPU 94 to 100 percent). This check separates "the game takes the graphics chip" from "tonight's
build is slower".

1. **Nothing running.** Direct to the model, the same memory room the plugin asks for:
   `time curl -s 127.0.0.1:11434/api/generate -d '{"model":"gemma4:e2b-it-qat","prompt":"Name three colours.","stream":false,"options":{"num_ctx":16384}}' | python3 -c "import json,sys;d=json.load(sys.stdin);print({k:d.get(k) for k in ('load_duration','prompt_eval_duration','eval_duration','eval_count')})"`
   (the durations are in nanoseconds). Then one plugin question, Strategy: "In Hollow Knight, what is Geo used for";
   time from the Ask press to the first visible word and to the end (read the page every second).
2. Unload the AI (`keep_alive` 0; `/api/ps` empty). Launch Deep Rock Galactic: Survivor; wait until its window has
   been in front for 60 s. Read the graphics load three times, 2 s apart:
   `cat /sys/class/drm/card*/device/gpu_busy_percent` (record every value), and `free -m`.
3. **Game running, direct to the model:** the same `curl` as step 1 wrapped as `timeout 240 curl ...`. Record the
   wall time and the durations (or that it timed out).
4. **Game running, the plugin:** reopen Quick Access, the Context line names the game. Strategy: "which upgrade
   should I pick first on a fresh dwarf". Time to the first visible word and to the end, up to 240 s. Copy the plugin
   log's lines for this ask (the attach line and any timeout or error line) and `journalctl -u plugin_loader --since
   "<the Ask time>" --no-pager | tail -40` if the plugin log is empty.
5. If step 3 was slow (over 60 s) too, the game is starving the model; say so. If step 3 was quick and step 4 slow,
   it is the plugin's own path; say so, with the log lines.

## K3.2: the game-running halves, only if step 4 answered within 90 s (rows P98-DEMOTE-01-game, P98-NOTES-BLOCK-04-game)

With the game still running: (a) "how should I deal with the glyphid dreadnought when it charges" — Show details'
notes and the attach line; Not really → Wrong tip → (the column if it shows) the first note → the confirmation names
it; read `rag_demote.json`; then (b) "what kills the dreadnought fastest" — the note is no longer first, or is tagged
"ranked lower by you". Then the three made-up questions, each must show the "No close match" line visibly on screen:
"Who is the boss known as Zorblax in this game", "How would I beat the boss named Grimthak right now", "Where can I buy
a house in this game". If step 4 did not answer within 90 s, record COULD NOT RUN for both rows and go on.
Exit the game; confirm the process is gone (bracketed `ps`); `free -m`.

## K3.3: Undo on the same answer (row P98-DEMOTE-01-undo)

Nothing running. "In Deep Rock Galactic Survivor, how do I beat the glyphid dreadnought on the first stage". Not
really → Wrong tip → (a note) → the confirmation with Undo; read `rag_demote.json` (one down). Then Undo (read focus
first) → A. **Pass when** the reasons come back with the ring on Wrong tip and `rag_demote.json` holds no entry (or
zero downs). Then "In Deep Rock Galactic Survivor, what is the dreadnought weak to": that note is listed as it was at
first (the attach line reads `demoted=-`).

## K3.4: the route look through a choice (row P98-ROUTE-01-try2)

Nothing running. In block K1 two route questions came back as prose with no checklist. In plan 96 a checklist came
from the choice flow: a "where am I stuck" question, the AI offers choices, picking one writes the steps.
"In Hollow Knight, where am I stuck: I cannot find my way out of the Forgotten Crossroads". If the AI offers choices,
walk to the first choice (read focus) → A. If the reply has a checklist of three or more steps: run the route checks
of block K1's K1.3 (the dots, step 1 open, "A shows this step" on the first covered step and "Covered" after, Down
walks each step once and leaves, A on the first covered shows it without a tick, A on a later covered does nothing,
A on an open step ticks it, close and reopen keeps the tick and the shown step) and save the walk with
`deck_saveCheck` as `P98-ROUTE-01` (checksDir the workshop's `checks`). If no checklist, one more try:
"In Hollow Knight, I am stuck before the first boss, walk me through it step by step". Still none: UNCLEAR with what
the AI wrote (copy the saved answer's last 600 characters).

## K3.5: handover

`98-handover-K3.md`: the build, the keep-awake expiry, the test chat, `rag_demote.json` (must be absent or empty at
the end; if you created an entry and Undo could not clear it, remove the file and say so), every setting changed, the
Deck's state.
