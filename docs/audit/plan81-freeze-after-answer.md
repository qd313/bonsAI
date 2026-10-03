# Steam froze after an answer with a game running (plan 81, 2026-10-03)

A dated record of a hunt, not a living doc. Evidence: `docs/test-evidence/plan81-DRG-01c.json` (the freeze) and
`plan81-DRG-01c-try2.json` (the same steps after a restart, no freeze).

## In plain words

**What a person saw.** Deep Rock Galactic: Survivor was running. A Strategy question was asked and the answer
finished normally (54.7 s). About two minutes later Steam's whole screen stopped answering. The game's title
screen stayed up, the plugin panel was gone, and only a forced restart of the Deck got out.

**Most likely cause, about 70 percent sure: the Deck ran out of memory.** The Deck's own AI (the
`gemma4:e2b-it-qat` model) takes about 5.8 GB when it is loaded cold with the plugin's 16,384-token room. The
frozen run started the question with only 2,035 MB free. When memory runs out the system swaps to disk, every
program slows down at once, and Steam's screen (which all Steam windows share) stops answering. The
numbers fit: swap in use 1.2 GB, load average 8.3, Steam's helper processes at 100 percent processor.

**Why not the plugin's own screen code: about 85 percent sure it is not the main cause.** The same build
(`afd2f444`), the same game, the same question, the same library-missing setup and the same page watcher on the
panel ran fine after a restart (try 2: 9,178 MB free before Ask, 3,106 MB at the lowest, no freeze). The only
thing that differed was how much memory was free. I also read every timer and watcher the plugin keeps after an
answer and ran a counting test on them (below); none of them can run away by itself.

**What I did not settle, and the Deck can settle it from data that already exists.** Was the model already
loaded when the question was asked? If it was loaded, the question added no memory and the freeze came from
somewhere else (the game plus Steam itself at 2 GB free). If it was cold, the load is the cause. The Deck's AI
service journal for 17:42 will say which: a "loading model" line with the load time at the start of that answer
means cold. Read that first, before any new run.

## What I checked and ruled out (the screen side)

- **Timers the plugin keeps after an answer** (all cheap, all stop when the panel closes): the game check every
  2 s (`useOllamaGameContextSync`), the game check every 1.5 s (`useStrategyChecklistSession`), the Show details
  slot measuring every 300 ms (`DetailsSlot`, five box reads per tick, only changes state when the face changes).
  The answer check-in (`useBackgroundGameAi`) stops by itself on "completed"; the smooth reveal
  (`useSmoothStreamReveal`) parks itself two beats after it catches up.
- **Counting test** (a scratch test, not kept): the Ask hook streamed 40 partial checks then completed; then 5
  simulated minutes with fake timers: 3 timers alive, zero calls to the back end. A full plugin mount idle for 60
  simulated seconds: 0 animation-frame requests, 0 page changes, 0 back-end calls. The test page has no real
  layout, so this proves "no timer loop", not "no layout loop".
- **Knowledge-base polling on the library-missing path**: the status timers in `KnowledgeBaseSection` run only on
  the AI-models tab, and the idle one only when the library is installed. The library-missing path asks nothing
  after the answer.
- **The back end after an answer**: one AI call per question. The second-pass checker (`run_verifier_second_pass`)
  is defined but called from nowhere. The chat sum-up runs only when a chat has outgrown its room. Read aloud is
  off by default (`voice_reply_mode` "off"; the Deck should read the saved value).
- **Looping animations** that stay after an answer: none found (the infinite ones belong to the stream-wait
  pulse and the caret while streaming, plus the question box breathing).

## The page watcher the Deck driver installed

It sampled the panel's text every 200 ms. It is weaker as a cause now, because try 2 ran a 250 ms watcher of the
same kind and did not freeze. It is not ruled out: with 2 GB free, a page that is slow to answer could have
been tipped over by it. The Deck can rule it out by repeating the cold, low-memory case with no watcher.

## Memory: what one question can add

- **Model and room.** `gemma4:e2b-it-qat` is 4.3 GB on disk. The plugin asks for a 16,384-token room
  (`PREFERRED_WINDOW_TOKENS`). Measured 2026-09-20: that room costs 0.59 GB over the default 4,096. Measured
  2026-10-03 (try 2): a cold question took available memory from 9,145 to 3,410 MB within 10 s, about 5.8 GB.
  The AI service is started with one parallel request, one loaded model and flash attention off on the Deck
  (`scripts/deck-restart-ollama-gpu.sh`), so there is no second copy.
- **Room is not the lever.** Dropping to 4,096 saves 0.59 GB of 5.8, and brings back the cliff where an
  overlong prompt silently loses its start (`ollama_window_fit.py`). Not worth it.
- **What unloads the model.** Only the keep-alive timer (setting `ollama_keep_alive`, default 5 minutes).
  Reloading the plugin does not touch the AI service, and neither does a game starting or quitting; Stop keeps the
  model loaded on purpose (`ollama_stop_service.py`). So a question 3 minutes after an earlier one finds the model
  loaded, and one 6 minutes later finds it cold. After an answer the model also stays in memory for the whole
  keep-alive time while the person is back in the game.
- **Does the plugin check free memory before asking the Deck's own AI? No.** Nothing in `py_modules` or `main.py`
  reads `/proc/meminfo`. The only memory-related rules are a size filter on which models are tried
  (`ollama_routing.py`) and the optional boot-time warm-up, which is off unless the developer switch is on.

## The smallest safe guard (proposed, not built)

Before sending a question to the Deck's own AI (loopback host only, never a PC), with a game running: if the
model is not loaded (`/api/ps`, already read by `token_accounting_service.py`) and available memory
(`MemAvailable`) is below a threshold, do not ask; say in plain words that the game is using too much of the
Deck's memory for the AI to start, and offer to ask again after the game is closed.

**Threshold from the numbers:** cold load costs about 5,800 MB; keep 1,500 MB of that after (the Deck driver's own
stop line, and the lowest healthy reading in try 2 was 3,106 MB). So about 7,300 MB available before the question.
Try 2 (9,178 MB) passes. The frozen run (2,035 MB) would be refused if it was cold.

**Why I did not build it.** The numbers do not separate the cases yet: (1) it is not known whether the frozen run
was cold; (2) on 2026-10-02 a question was answered fine with about 1,745 MB available, which the guard would also
have refused if that run was cold (it was probably warm, but nobody recorded it); (3) "available" counts file cache
the kernel can drop, so it over- or under-states what a load can really get; (4) one healthy and one failed run is
too few to set a refusal that blocks a question people could otherwise ask. A wrong threshold takes away a working
feature just before the release. If the Deck confirms the cold case below, the guard is a small change (one
`/proc/meminfo` read in the Ask path, one new plain-words result, tests at the level of the answer on screen).

## What the Deck should measure next

Read first, no new run needed:
1. The AI service journal around 17:42 on 2026-10-03: was the model loaded cold for that question, and how long did
   the load take?
2. The saved settings: `ollama_keep_alive`, `voice_reply_mode`, the Ask mode and model try order.

Then one cold run and one warm run, same game (Deep Rock Galactic: Survivor), library aside, **no page watcher**,
sampled every 5 s from before the game starts to 6 minutes after the answer: `MemAvailable`, swap used, load
average, per-process memory and processor for the AI service, the game, and Steam's web helper processes, plus
`ollama ps` at the start and after the answer.
- Cold and low memory (below about 3,000 MB available before Ask; reach it by leaving the Deck up for hours or
  starting a heavier game) with no watcher: if it freezes, the memory theory stands and the watcher is cleared.
- Warm (model loaded by an earlier question within 5 minutes) at the same low memory: if it does not freeze, the
  load is the trigger and the guard's "not loaded" condition is right.
- Watch what grows after the answer finishes. Memory falling by about 1 GB over the next 9 minutes (as in the
  frozen run) with the AI service steady would point at Steam's own processes, not the model.
