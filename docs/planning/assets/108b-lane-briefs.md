# Plan 108b: the briefs, one per helper

How a brief is assembled: the session hands each helper [108-helper-rules.md](108-helper-rules.md), the section below
with its letter, the tip hash, the absolute path of its own copy of the repo, and the plan id (108b). A section says:
what a player sees today, where it comes from (files and the reading behind it), what to build, the files owned, the
tests, and the check that proves it (the row). Evidence files are named `plan108b-<ROW>.json` by the driver, never by
a helper. The plan itself is [108b-keep-alive-and-smart-unload.md](../108b-keep-alive-and-smart-unload.md).

**Line numbers are as read at tip `28306e896` on 2026-11-19 by one reader, not yet spot-checked by a second; the
session re-checks every section against the tip at go.** A lane that finds a line has moved re-greps and says so; a
lane that finds its brief wrong says so and stops rather than building the brief's mistake.

Model and effort per lane are in each title and in the plan's § 5.

## Rules special to this plan

1. **Nothing here may send an unload to any address but the Deck's own** (`127.0.0.1:11434`,
   `DEFAULT_OLLAMA_BASE_URL`, `py_modules/backend/core/constants.py:20-23`). No function a lane adds takes an address
   from the screen. Every
   lane that can unload carries a test that fails if the address could be anything else.
2. **Never unload while an answer is being written.** "Being written" means a question is pending
   (`self._background_state.get("status") == "pending"`, read under `self._background_lock`, as `main.py:1942-1949`
   does) or the AI's worker is busy (`sample_linux_ollama_runner_cpu_cores`, `ollama_stop_service.py:444`, at or over
   `RUNNER_BUSY_CORES`, `:413`). Tests prove both directions.
3. **No new setting, and no change to the existing one.** `ollama_keep_alive`, its thirteen stops and its plumbing
   stay exactly as they are. If your lane seems to need a setting, stop and report.
4. **Plan 107 owns the neighbours.** Do not touch `src/features/answer/transcript/lowMemoryNotice.ts`, the "Ask
   anyway" row on the screen, or `LOW_MEMORY_MESSAGE_START` (`ollama_memory_guard.py:78`).
5. **`py_modules/backend/ollama/ollama_game_unload.py` is one file shared by lanes A, A2, D2 and B2.** They run one
   after another, each cut from a tip that already holds the one before.
6. **No helper touches the Deck.** This PC's own Ollama (`127.0.0.1:11434`) may be used to see what an unload call
   returns, one call at a time; nothing from it goes into the repo.

## The ground, as read (shared by every lane)

- **The setting.** `ollama_keep_alive`: thirteen tokens `"0s"` to `"240m"`
  (`py_modules/backend/settings/settings_service.py:269-285`), default `"5m"` (`:286`), field (`:294`),
  `sanitize_ollama_keep_alive` (`:320-322`), field table row (`:406`). Screen side:
  `src/features/ai-connection/ollamaKeepAlive.ts` (type `:23`, order `:38`, default `:54`, labels `:59-73`), the
  slider `SettingsTabOllamaKeepAliveSlider.tsx`, the row in `OllamaTab.tsx:355-368` (label "Keep models loaded",
  `:356`), its help text `ollamaTabFolds.ts:53`, its folded value `ollamaTabFolds.ts:82`.
- **The rule.** `py_modules/backend/ollama/ollama_keep_alive_rule.py`: `GAME_RUNNING_KEEP_ALIVE = "1m"` (`:42`),
  `_state` (`:44`), `note_game_running` (`:47-49`), `game_running` (`:52-53`), `ai_is_on_this_deck` (`:66-72`),
  `effective_keep_alive` (`:75-93`, its log line `:92`). The only caller of `note_game_running` is
  `py_modules/backend/ask/game_ai_request.py:239`, once per Ask, with "did the screen send a game id".
- **Who asks the rule.** The answer: `py_modules/backend/ask/ollama_ask_service.py:183` (used at `:341` and `:472`);
  the chat sum-up job: `py_modules/backend/chats/chat_sum_up_job.py:126`; the notes lookups:
  `py_modules/backend/knowledge/knowledge_base_service.py:1133` and `:1383`; the picture guess:
  `py_modules/backend/ask/picture_guess.py:305-307` (`_UNLOAD_AT_ONCE = "0s"`, `:59`, when the guess uses a
  different model from the answer). The value goes into the request at
  `py_modules/backend/ask/ollama_chat_stream.py:212` and `py_modules/backend/knowledge/ollama_embed_service.py:174-175`.
- **Who does not ask the rule.** The two warm-ups: `py_modules/backend/ollama/ollama_preload_service.py:175` builds
  `{"model": model, "prompt": ""}` with no `keep_alive` (`preload_ask_model_sync`, `:130`; `warm_after_setup`,
  `:198`). Boot caller: `main.py:366-410`, behind the Developer setting `dev_preload_ask_model`
  (`settings_service.py:392`). After-install caller: `py_modules/backend/ollama/ollama_local_setup_rpc.py:188` (imported at `:60`).
- **The memory check.** `py_modules/backend/ollama/ollama_memory_guard.py`: `MEMORY_LIMIT_MB = 2000` (`:64`),
  `LOAD_SIZE_FACTOR = 1.42` (`:72`), the test switch (`:74-75`, `:130-138`), `read_available_mb` (`:110-119`),
  `check_memory_for_model` (`:171-198`), `ask_memory_warning` (`:232-253`; the asked-anyway branch `:240-243`),
  `memory_short_for_sum_up` (`:256-265`). Called at `ollama_ask_service.py:330` and `chat_sum_up_job.py:124`. The
  screen's method is `arm_ollama_ask_anyway` (`main.py:1225-1229`).
- **Unload and Stop.** `py_modules/backend/ask/ollama_stop_service.py`: `request_ollama_stop_model_via_api`
  (`:195-284`, a POST to `/api/generate` with `keep_alive: 0`), `try_ollama_cli_stop_model` (`:287-330`),
  `sample_linux_ollama_runner_cpu_cores` (`:444-468`), `_unload_stuck_local_model` (`:471-477`),
  `best_effort_abort_ollama_inference` (`:480-553`). Stop's method: `abort_background_game_ai` (`main.py:1917`). A
  normal Stop unloads nothing.
- **What is loaded.** `py_modules/backend/ollama/ollama_health_probe.py`: `probe_ollama_health(base, deadline)`
  (`:85`) returns `ps_loaded` rows (`name`, `size_bytes`, `size_vram_bytes`; `_loaded_model_snapshots`, `:44`) and
  `model_sizes`.
- **How the plugin learns a game is running.** Only from the screen, and only while the panel is open:
  `Router.MainRunningApp`, polled every 2 s by `src/features/ask/flow/useOllamaGameContextSync.ts:32` and `:47`, and
  sent as the game id with each Ask. Nothing registers for Steam's game notices: `git grep SteamClient -- src`
  finds only `SteamClient.URL` and `SteamClient.Parental` uses. The plugin's entry, `src/index.tsx:1221-1234`,
  returns an empty `onDismount` (`:1232`); nothing of bonsAI's runs on the screen side while the panel is closed.
- **The notice Steam offers.** `SteamClient.GameSessions.RegisterForAppLifetimeNotifications(callback)`, declared in
  `node_modules/@decky/ui/dist/globals/steam-client/GameSessions.d.ts:6`; the notice carries `unAppID` (`:10`),
  `nInstanceID` and `bRunning` (`:17-20`). Sleep and wake notices are declared in
  `.../steam-client/system/index.d.ts:43-44`. **Not yet confirmed here** that the game notice fires on this Deck's
  Steam with the panel closed: step S0, reading 5.
- **Tests that exist.** `tests/test_ollama_keep_alive_rule.py` (classes at `:52`, `:94`, `:134`, `:166`),
  `tests/test_ollama_memory_guard.py`, `tests/test_ollama_preload.py`, `tests/test_preload_ask_model_boot.py`,
  `tests/test_ollama_stop_keeps_model_loaded.py`, `tests/test_ollama_service.py`, `tests/test_game_ai_request.py`.
  `tests/test_seam_contracts.py` names none of the functions above (grep, 2026-11-19); re-grep before you change a
  signature.
- **The Deck today** (four reading commands, 2026-11-19): Ollama `0.40.16`; `/api/ps` empty; `MemTotal` 14,798 MB,
  `MemAvailable` 11,800 MB; swap is 7.2 GB of zram plus a 1 GB file, swappiness 60; `/proc/pressure/memory` exists;
  the start file `~/.config/systemd/user/bonsai-ollama-autostart.service` sets `OLLAMA_NUM_PARALLEL=1` and
  `OLLAMA_MAX_LOADED_MODELS=2` and no `OLLAMA_KEEP_ALIVE`; the newest plugin log's Asks all read
  `keep_alive 5m: setting [ask]`.

---

## S0 — The test to find out: one Deck block (driver, Sonnet medium; the session reads the results)

The session turns this section into the block's runbook (`108b-runbook-block-S0.md`) and adds the Deck facts of the
day. No new code is deployed. One evidence file per reading.

**Standing rules for the block.** Check the Deck's status for another driver first. Hold the Deck awake. Snapshot
the settings and restore only your own keys. **Never reload the plugin with a game starting or running.** Unload the
Deck's AI before every game launch except in reading 4b. **Stop line:** if `MemAvailable` reads under 1,500 MB at
any moment, unload the AI at once, write it down and end that reading. God of War is not launched in this block
unless the session's facts say the maintainer chose (b) for call b7. Never press "Ask anyway". Never print the
values of the plugin's settings file.

**Commands** (over SSH, on the Deck itself):

- Loaded models, names only: `curl -s 127.0.0.1:11434/api/ps`.
- Unload: for each model listed, `curl -s 127.0.0.1:11434/api/generate -d "{\"model\":\"<name>\",\"keep_alive\":0}"`;
  read `/api/ps` again until it is empty (as `103-runbook-block-D0.md:49-51`).
- Memory: `grep -E "MemAvailable|Cached|SwapFree" /proc/meminfo; cat /proc/pressure/memory`.
- **The timed load** (no plugin, so no answer cache):
  `curl -s 127.0.0.1:11434/api/generate -d '{"model":"<T>","prompt":"Say the single word ready.","stream":false,"keep_alive":"10m","options":{"num_ctx":<W>,"num_predict":4}}'`
  and record `load_duration`, `prompt_eval_duration`, `eval_duration` and `total_duration` (nanoseconds) from the
  reply. `<T>` is the answering model's name and `<W>` its window: ask one ordinary question in the panel first, then
  read both from `/api/ps` (`name`, `context_length`). The same window matters: a load at another window makes the
  next Ask load the model again (measured on this Deck, row PRELOAD-01, try 3).
- **The timed panel question:** sent by `scripts/deck_send_ask.py` (Main tab only), then A on Ask. Start time: the
  plugin log's `keep_alive … [ask]` line. First word: the first page read in which the new answer has text. A new
  wording every time, from this list, never one twice: "What does the Scout class do best in Deep Rock Galactic
  Survivor?" · "Which upgrade should I take first as an Engineer in Deep Rock Galactic Survivor?" · "How do
  overclocks work in Deep Rock Galactic Survivor?" · "What is the fastest way to mine gold in Deep Rock Galactic
  Survivor?" · "How do I beat the first dreadnought in Deep Rock Galactic Survivor?" · "What do the different biomes
  change in Deep Rock Galactic Survivor?"

**Reading 1, no game** (row P108B-S0-COLD-WARM, first half). Unload. Timed load, cold. Timed load again, warm. Unload.
Repeat the pair once. Unload. One timed panel question, cold; a second within 40 seconds, warm. Record memory before
and after each load.

**Reading 2, a light game** (same row, second half). Unload. Launch Deep Rock Galactic: Survivor; 30 seconds in
front; get into a mission as the SCR-10 mission run did (`workshop:test-evidence/plan79-SCR-10-MISSION.json`), and say
exactly where the game stands (live, paused on a pick, or title screen). Then the same sequence as reading 1. If the
low-memory warning shows instead of an answer, record its numbers and end the reading there. **The number the plan's
first line reads:** panel cold minus panel warm, beside the game, in seconds; the two timed loads are the cross-check.

**Reading 3, the idle AI beside the game** (row P108B-S0-IDLE-HOLD). Game in front, panel closed, Steam's performance
overlay on (the frame rate was read from it in three screenshots in the SCR-10 mission run). AI unloaded: three
screenshots 20 seconds apart, and memory. Then the timed load once (nobody asking afterwards), wait 30 seconds, and
the same reads at 0, 2.5 and 5 minutes. Unload; the same reads once more. **The numbers the plan's second line
reads:** the game's frame rate with and without the idle AI; the lowest `MemAvailable` with it; how much swap in use
grew over the five minutes. If the overlay cannot be shown, write UNCLEAR for frames and keep the memory numbers.

**Reading 4, a game starting** (row P108B-S0-GAME-START). Exit the game. 4a, clean: AI unloaded; note the Deck's
clock; launch the game; a screenshot every 5 seconds until the title screen shows; memory every 5 seconds; record
seconds to the title screen and the lowest `MemAvailable`. Exit. 4b, on top of a loaded AI: the timed load once (it
holds for ten minutes), then the same launch and the same reads, with the stop line armed. Exit; unload.

**Reading 5, the notice with the panel closed** (row P108B-S0-NOTICE). In the page the plugin's own code runs in
(Steam's shared page, the one `scripts/deck_send_ask.py` and `scripts/probe_deck_ui_look.py` reach through the
debugger), evaluate once:
`window.__p108b = []; window.__p108bStop = SteamClient.GameSessions.RegisterForAppLifetimeNotifications(n => window.__p108b.push({t: Date.now(), id: n.unAppID, running: n.bRunning}));`
Close the panel. Note the Deck's clock in milliseconds. Launch the game; wait 30 seconds; read
`JSON.stringify(window.__p108b)`. Exit the game; read it again. Three launches in all. At the end:
`window.__p108bStop.unregister(); delete window.__p108b; delete window.__p108bStop;`. **Pass:** a `running: true`
entry within 5 seconds of each of the three launches. Also record whether an exit gives a `running: false` entry, and
any entry whose id is not the game's. **If the rig cannot evaluate a line in that page, do not improvise:** write
"could not run" and tell the session; lane A's first commit then carries the listener with a log line only, and this
reading is taken from the plugin's log after a deploy with no game running.

**Reading 6, sleep, only if the block is under 50 minutes so far** (row P108B-S0-SLEEP). No game. The timed load with
`"keep_alive":"5m"`. Read the model's `expires_at` from `/api/ps`. Sleep the Deck for 120 seconds and wake it. Read
`/api/ps` again, then one timed load. Record: still loaded or not, whether `expires_at` moved, the load time.

**Handed back:** nothing loaded, no game, settings as found, the keep-awake released, and a handover with the build
hash, each reading's numbers beside the line it is read against, and anything that could not run.

---

## M — The drawing for calls b5 and b6 (★ `[ui]`, mock-up helper, Opus at medium or high by the house rule of 2026-11-19)

Mock-up board 7 is reserved for plans 108a to 108g; the session creates its folder and hands you your tab's two
files. How a board works: `docs/demos/mockup-board-5/README.md`; the kit: `docs/demos/mockup-board-2/src`. True size
(the plugin's column is 300 points), real words copied from the code, plain language on every card.

**The tab, "108b: what the Keep models loaded row says".** Draw the Connection tuning part of the Ollama tab around
the row: the row above it, the row itself, the fold line below.

- **Today.** Label "Keep models loaded" (`OllamaTab.tsx:356`); the value chip, for example "15m"
  (`ollamaKeepAlive.ts:59-73`); help text "How long Ollama keeps the model in memory after a prompt (VRAM on the
  host)." (`ollamaTabFolds.ts:53`).
- **A, a plain line.** Same row; the help text becomes: "How long the AI stays in memory after an answer. Longer
  means the next answer starts sooner. While a game runs, the Deck's own AI is let go about a minute after each
  answer, and at once when a game starts." Card: nothing new to press; the row grows by the extra lines (measure
  it on the drawing and say how many points).
- **B, the line plus a button.** As A, with a button under the slider: "Free the AI's memory now". Pressable through
  the kit's D-pad engine: Down from the knob lands on it; A shows "Freed about 5.9 GB" for a moment, or "Nothing was
  loaded". Card: one more D-pad stop on this tab; only for the Deck's own AI.
- **C, the value shows the rule.** As Today, but while a game runs the chip reads "15m · 1m while Deep Rock
  Galactic: Survivor runs". A switch on the card flips "a game is running" so the change is seen. Card: nothing new
  to press; the value changes by itself when a game starts.

Each card carries the kit's Like / Not this and comment block. Files owned: your tab's two files only.

---

## A — A starting game gets the AI's memory back (★★ `[ollama]`, Sonnet high)

Waits on: step S0's reading 5 passing, and the maintainer's answers to b1 (written here for choice a: always, no
setting) and b4 (written here for choice a: everything loaded in the Deck's own Ollama). If either answer differs,
the session rewrites this section before you start.

**What a player sees today.** They ask with no game running, then start a game. The AI stays in memory for the
slider's full time (five minutes by default, up to four hours), about 5.9 GB the game cannot use.

**Where it comes from.** The rule learns "a game is running" only when a question is asked
(`game_ai_request.py:239`). Nothing listens for a game starting (see "The ground"). Ollama keeps a model for the
hold time of the last request that touched it, so a question asked before the game keeps the long hold.

**What to build.**

1. **Screen, a new file `src/features/ai-connection/gameSessionWatch.ts`** (with the house header). It exports
   `startGameSessionWatch(): () => void`. It reads `SteamClient.GameSessions.RegisterForAppLifetimeNotifications`
   off `globalThis`, the way `src/features/permissions/steamParental.ts:60` reads its own Steam function; if it is
   missing it does nothing and returns a stop function that does nothing. On each notice: `appId =
   String(n.unAppID)`, `running = n.bRunning === true`. For a start, `anyGameRunning` is `true`. For a stop, wait
   1,000 ms, then `anyGameRunning` is whether `Router.MainRunningApp` still names a game. Then
   `callDeckyWithTimeout("note_ollama_game_session", [appId, running, anyGameRunning])` (the wrapper takes an
   array). A failed call is swallowed with a debug line; never a toast, never a retry. Nothing is sent when the
   watch starts. The returned function calls the registration's `unregister()`.
2. **`src/index.tsx`, three lines only:** inside `definePlugin(() => {` (`:1221`) call
   `const stopGameSessionWatch = startGameSessionWatch();`, and make `onDismount()` (`:1232`) call it. This is what
   keeps the watch alive while the panel is closed.
3. **Back end, a new file `py_modules/backend/ollama/ollama_game_unload.py`** (with the house header).
   - `async def on_game_session(plugin, app_id: str, running: bool, any_game_running: bool) -> dict`. First
     `ollama_keep_alive_rule.note_game_running(any_game_running)`, so every later request carries the game's one
     minute. A stop returns `{"acted": "noted"}`. A start makes sure one waiting task exists (below) and returns
     `{"acted": "scheduled"}` at once; a second start while one waits adds nothing.
   - `async def _let_go_when_quiet(plugin, reason: str, *, only_while_game: bool = True) -> str`. The address is
     always this Deck's (`DEFAULT_OLLAMA_BASE_URL`, `constants.py:23`); it is never a parameter. The first look is at
     once; then every
     `CHECK_SECONDS = 5`, for at most `MAX_WAIT_SECONDS = 600`: if `only_while_game` and the rule says no game is
     running, log "the game ended first, nothing let go" and return; read what is loaded with `probe_ollama_health`
     in a thread (3 s deadline); Ollama silent or nothing loaded: log and return; a question pending or the worker
     busy (rule 2 above): wait and look again; otherwise unload each loaded model with
     `request_ollama_stop_model_via_api` in a thread, read `read_available_mb()` before and after, and write one log
     line: `game_unload: <reason>; let go <names>; free <before> -> <after> MB`. After the full wait: log "still busy
     after 600 s, nothing let go".
   - Names for the return value: `"let_go"`, `"nothing_loaded"`, `"game_ended"`, `"still_busy"`.
4. **`main.py`, one method inside `class Plugin`,** beside `arm_ollama_ask_anyway` (`:1225`), four-space `async def`:
   `note_ollama_game_session(self, app_id: str = "", running: bool = False, any_game_running: bool = False) -> dict`.
   It hands straight to `on_game_session` with `str(app_id or "")`, `running is True`, `any_game_running is True`.
   The name carries "ollama" on purpose, so the generated map files it beside its siblings.

Ollama is understood to finish a request that is running before it unloads a model (**not yet confirmed here**; row
P108B-GAME-START-02 is the proof on the Deck). The quiet check is still required: do not lean on that.

**Files owned.** The two new files and their tests; `main.py` (one import, one method); `src/index.tsx` (three
lines). **Do not touch** `ollama_keep_alive_rule.py`, `ollama_stop_service.py`, `ollama_memory_guard.py`,
`ollama_health_probe.py` (call them; change nothing), `game_ai_request.py`, `ollama_ask_service.py`, the Ollama tab's
files, `src/test-harness/setup.ts` (give your test its own stand-in for the Steam function), or the generated
`src/types/rpcMethods.ts`.

**Tests.**
- `tests/test_ollama_game_unload.py`, with the clock, the sleep, the probe, the busy sample and the unload call
  handed in as stand-ins: a start with a model loaded and all quiet unloads each loaded model once, at the loopback
  address; a start with a question pending unloads nothing until the pending mark clears, then unloads; the same for
  a busy worker; the game ending while it waits means no unload; nothing loaded or Ollama silent means no unload and
  no error; a stop with no game left sets `game_running()` false, and with a game left keeps it true; two starts make
  one waiting task; with Ask routed to a PC in the settings the unload still goes to loopback and nowhere else.
  **Break the guard on purpose** (rule 2, then rule 1), see the test fail, put it back, and name each failure in the
  commit message.
- The method: it exists with that signature and returns before the waiting task has done anything (the way
  `tests/test_preload_ask_model_boot.py` proves `_main` never waits on the warm-up).
- `src/features/ai-connection/gameSessionWatch.test.ts`: a start notice makes the call with `[appId, true, true]`; a
  stop notice makes it after the wait with what `Router.MainRunningApp` says; a missing Steam function neither throws
  nor calls; the stop function unregisters.
- **Wider:** search `src` for tests that pin the plugin entry (`definePlugin`, `onDismount`); run `npm run
  mcp:validate` after the commit hook has rewritten `src/types/rpcMethods.ts`; check the growth limits in
  `scripts/ratchet.json` for `main.py` and `src/index.tsx` before you commit.

**The check that proves it.** P108B-GAME-START-01, P108B-GAME-START-02 and P108B-GAME-START-PC, on the Deck, by the
rig (block S1).

---

## A2 — After "Ask anyway" the AI leaves when the answer ends (★ `[ollama]`, Sonnet high)

Waits on: lane A landed; the maintainer's answer (a) to b3. Read what plan 107 landed around "Ask anyway" first.

**What a player sees today.** Beside a heavy game the warning shows; they press "Ask anyway"; the answer comes; the
AI then stays loaded for another minute, in memory the warning just said was short.

**Where it comes from.** `ask_memory_warning` skips its check when "Ask anyway" was armed and writes
`{"asked_anyway": True, …}` into the turn's diagnostics (`ollama_memory_guard.py:240-243`). The hold time was worked
out long before, at `ollama_ask_service.py:183`, and every model call inside the Ask carries it (`:341`, `:472`).
**Do not send `"0s"` on those calls:** each step inside the Ask would unload the model and the next would load it
again, beside a heavy game.

**What to build.**

1. In `ollama_memory_guard.py`: remember that the Ask in flight was asked anyway (a module mark set in the
   `consume_ask_anyway()` branch), and `take_asked_anyway() -> bool`, which reads and clears it.
   `reset_for_tests()` clears it too.
2. In `ollama_game_unload.py`: `async def let_go_after_ask_anyway(plugin) -> None`. If `take_asked_anyway()` is true,
   make sure one waiting task exists with `reason="asked anyway"` and `only_while_game=False`. Otherwise nothing.
3. Call it once where a background Ask ends: at the end of `run_game_ai_request` (`game_ai_request.py:203`; its `try`
   opens at `:242`, its `except` is at `:1155`) or at the place in `main.py` that marks the background state
   finished. Pick the one path that runs after a success, a failure and a Stop alike, and say which in your report.

**Files owned.** `ollama_memory_guard.py`, `ollama_game_unload.py`, one call in `game_ai_request.py` or `main.py`,
and `tests/test_ollama_memory_guard.py`, `tests/test_ollama_game_unload.py`. **Do not touch** the hold-time plumbing
in `ollama_ask_service.py`, or anything in rule 4.

**Tests.** Asked anyway: the let-go is scheduled once, at the Ask's end, and unloads once all is quiet. Not asked
anyway: never scheduled. The mark does not survive into the next Ask. The sum-up job after such an answer still
refuses on low memory (the existing `memory_short_for_sum_up` tests stay green). Wider: every test that arms or
patches `consume_ask_anyway`; `tests/test_game_ai_request.py`.

**The check that proves it.** P108B-ASK-ANYWAY-01, Deck, rig, beside a light game with the limit raised by the test
switch file (as P104-MEMORY-02). Never beside a heavy game.

---

## P — The two warm-ups obey the slider (★ `[ollama]`, Sonnet medium)

Waits on nothing; may run beside S0 and M.

**What a player sees today.** Nothing, unless the Developer warm-up is on or an install has just finished: then the
warmed AI leaves after Ollama's own five minutes whatever the slider says, and with the slider at its first stop
("0") it is still loaded and held for five minutes.

**Where it comes from.** `ollama_preload_service.py:175` builds the warm request with the model and an empty prompt
and adds the window, never a hold time. The rule file's own header says every request that can load the AI goes
through it (`ollama_keep_alive_rule.py:11-13`); these two do not.

**What to build.** In `preload_ask_model_sync` (`:130`), which `warm_after_setup` (`:198`) also uses:

1. `hold = effective_keep_alive(settings.get("ollama_keep_alive") if isinstance(settings, dict) else None,
   base_http, source="warm-up")`, and `warm["keep_alive"] = hold`.
2. If `hold == "0s"`, send nothing and log `preload_ask_model: the hold is 0, skipping`.
3. The import runs from the warm-up file to the rule file; confirm it makes no import loop (the Python tests fail
   on one).

**Files owned.** `ollama_preload_service.py`, `tests/test_ollama_preload.py`, `tests/test_preload_ask_model_boot.py`.

**Tests.** The warm request carries the setting; with a game noted and the Deck's address it carries `"1m"`; with
`"0s"` no warm request is sent at all, while the model list is still read (both directions); with no settings it
carries `"5m"`. Wider: the preload tests patch `urllib.request.urlopen` and count calls; update the counts on purpose.

**The check that proves it.** P108B-WARMUP-01, Deck, rig, with no game running.

---

## D — The Ollama tab says what happens (after the maintainer's pick on the drawing)

The session writes the final brief from the picked card; the three shapes are sized here so it can be routed.

- **D1, words only (card A): ★, Sonnet medium.** Change `OLLAMA_ROW_HELP.keepAlive` (`ollamaTabFolds.ts:53`) to the
  picked words, copied from the drawing. Search `src` and `tests` for the old sentence first. No D-pad change.
- **D1c, the live value (card C): ★★, Sonnet high.** The chip in the slider
  (`SettingsTabOllamaKeepAliveSlider.tsx:96-97`) and the folded value (`ollamaTabFolds.ts:82`) add "· 1m while
  <game> runs" when `Router.MainRunningApp` names a game, "Run AI on this Deck" is on and the slider is over a
  minute. The tab already receives the settings it needs; the count of things passed to a tab may only shrink.
- **D2, the button (card B): ★★★ `[focus]`, Opus extra-high, and only after a device measurement.** A new stop in the
  Connection tuning fold between the knob and the fold line below: `OllamaTab.tsx:355-368` (`onMoveDown`, `:363`),
  `useOllamaTabFocus.ts:107`, `:135`, `:161-163`. The walks it must keep true:
  `src/features/folded-tabs/autoFold.walk.test.tsx:52-58`, `autoFold.frames.test.tsx:127`,
  `OllamaTab.foldedWalk.test.tsx:387-414`. A new method `free_ollama_memory_now` in `main.py` hands to
  `_let_go_when_quiet` with `reason="button"` and `only_while_game=False`; while an answer is being written the
  button's line reads "The AI is answering. It will be let go when it finishes." Hidden when the AI runs on a PC.
  Owes a D-pad row and the second opinion before landing.

**The check that proves it.** P108B-TAB-LINE-01 and the look check for the Ollama tab on both screens; for D2 also a
D-pad row, there and back.

---

## B1 — Beside a light game the AI stays ready longer (★★★ `[ollama]`, Sonnet high). Only on a go.

Built only if step S0 met both lines of the plan's § 5 and the maintainer chose (b) for b2. The session writes the
final numbers into this section, with their evidence file, before you start. Waits on lane A2 landed.

**What to build.** In `ollama_keep_alive_rule.py`: the Ask notes how much memory will be left with the AI loaded
(`left_mb` of the memory check's verdict, `ollama_memory_guard.py:88-99`) through a new `note_room_mb(value)`. In
`effective_keep_alive`, the branch "game running and the AI on this Deck" becomes: room known and at or over
`ROOMY_MB` (start value 3,000; the session replaces it from the readings) gives the setting, capped at `"15m"`;
anything else gives one minute, as today. Room unknown is one minute. The log line names the room. The Ask works its
hold out at `ollama_ask_service.py:183`, before the memory check at `:330`: move that one line after the check, or
work it out again there, and say which.

**Files owned.** `ollama_keep_alive_rule.py`, `ollama_ask_service.py` (that one line), `ollama_memory_guard.py`
(handing the verdict's number on), `tests/test_ollama_keep_alive_rule.py`.

**Tests.** Roomy gives the setting, capped; tight gives one minute; unknown gives one minute; a setting under a minute
is kept; the AI on a PC is unchanged; the sum-up job and the lookups that follow read the same answer.

**The check that proves it.** P108B-ROOM-HOLD-01.

## B2 — A held AI lets go if memory runs low (★★★ `[ollama]`, Sonnet high). Only with B1.

Waits on B1 and lane A landed. A new file `py_modules/backend/ollama/ollama_low_memory_watch.py`: while a game runs
and the last hold sent was over a minute, read `read_available_mb()` every 10 seconds; under `WATCH_LINE_MB = 1500`
(a test switch file beside the memory check's own, `ollama_memory_guard.py:74-75`), hand to `_let_go_when_quiet` with
`reason="memory low"`. One watcher at most; it ends when the game ends or nothing is loaded. It reads only
`/proc/meminfo` on its timer. Tests: both directions, and that it never runs with the AI on a PC or with no game.
**The check that proves it.** P108B-LOW-MEMORY-01.

---

## S1 — The Deck block after the lanes land (driver, Sonnet medium)

The session writes the runbook from the plan's § 6, in this order, with S0's standing rules: P108B-GAME-START-01,
P108B-GAME-START-PC (the PC's address set for the row, put back after), P108B-GAME-START-02, P108B-ASK-ANYWAY-01
(test switch file placed, then removed), P108B-WARMUP-01 (no game; the Developer switch put back as found),
P108B-TAB-LINE-01, then the conditional rows. Each row reads the plugin's log line (`game_unload: …` or
`keep_alive …`) and `/api/ps` beside what is on screen.

## K — The bookkeeper's paperwork (Sonnet medium)

- **At go:** decision D145's b calls, word for word from the plan's § 4, with the maintainer's answers. The roadmap
  entry reworded as the planning chat's report gives it (status PARTIAL, the plan link). One open row per check of
  the plan's § 6 in the testing files, each naming its machine; P108B-HAND-01 goes on the "checks only you can do"
  page.
- **After S0:** the readings, in plain words, into the long notes of both entries (this one and "What bonsAI costs a
  running game"), each number with its evidence file. Invent no result.
- **When lanes land:** the entry moves to Verify in the same change, naming the rows; when the rows pass, one line in
  Done and the full entry to the archive. If the test said no-go for B1 and B2, the entry says so in one sentence and
  keeps the numbers' link.
- **docs/troubleshooting.md** gains two sentences when lane A lands: the AI is let go when a game starts, and the
  next question after that takes longer to start.

## The reviewers' questions

- **Security reviewer, lane A, one question:** "`note_ollama_game_session` takes three values from the screen. Can
  any of them make the back end contact an address other than the Deck's own Ollama, or unload a model on a PC? Can
  repeated calls pile up tasks or requests?" Expected: no (the address is a constant; one waiting task).
- **Second opinion, lane D2 only:** before landing, as before any D-pad landing.
- No new dependency, licence, permission, disk read, download or microphone use is planned, so no other review is
  owed.

## Outside facts, and where each comes from

- Ollama keeps a model for five minutes by default; a request's `keep_alive` (a duration, a number of seconds, a
  negative number for "forever", or 0 for "unload now") overrides it for that model; `OLLAMA_KEEP_ALIVE` sets the
  server's default; `ollama stop <model>` unloads. Source: Ollama's FAQ, <https://docs.ollama.com/faq>, as
  summarised by a web search on 2026-11-19 (the page itself was not opened).
- **Confirmed on this Deck:** a per-request `"1m"` is obeyed and `/api/ps` gives `expires_at`
  (`workshop:test-evidence/plan89-P89-KEEPALIVE-GAME-half2.json`); `keep_alive: 0` with no prompt unloads (every
  runbook since plan 100); the Deck's start file sets no `OLLAMA_KEEP_ALIVE` (read 2026-11-19).
- **Not yet confirmed here:** that a non-streamed `/api/generate` reply carries `load_duration` on Ollama 0.40.16
  (S0's first timed load shows it; if it is missing, time the call with the Deck's clock instead); that an unload
  request waits for a running request to finish; that the game notice fires with the panel closed.
