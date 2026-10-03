# Steam froze after an answer with a game running (plan 81, 2026-10-03)

A dated record of a hunt, not a living doc. Evidence: `docs/test-evidence/plan81-DRG-01c.json` (the freeze) and
`plan81-DRG-01c-try2.json` (the same steps after a restart, no freeze). Second version, written after the Deck's
journal for the night was read (it settles the first version's main question).

## In plain words

**What a person saw.** Deep Rock Galactic: Survivor was running. A Strategy question was asked and the answer
finished normally (54.7 s). About two minutes later Steam's whole screen stopped answering. The game's title
screen stayed up, the plugin panel was gone, and only a forced restart of the Deck got out.

**What the Deck's journal settled.** The AI model was already loaded ("warm") when the question was asked, so
the question did not load it. At 17:42:03 Ollama reused an existing slot and a saved prompt cache ("16 prompts,
652.852 MiB", limits 8192 MiB and 16,384 tokens). The answer ended 17:42:58 (prompt 3,421 tokens in 11.8 s, reply
711 tokens in 42.4 s, 200 in 54.6 s). After that Ollama logged **nothing at all** until 17:58. The out-of-memory
guard (earlyoom) fired at 17:56:03 with 665 of 5,198 MiB available and 6,596 of 8,423 MiB swap free. So the first
version's leading theory (a cold load of 5.8 GB ran the Deck out of memory) is **wrong for this freeze**. I keep
it in the record below because it still describes what a cold question costs.

**What is now most likely, about 60 percent sure: memory was eaten after the answer by Steam's own page
processes** (they were at 100 percent processor), starting from only about 2 GB free because the warm model, its
prompt cache and the game already held most of the Deck. The AI service was idle at that time, so it is not the
thing that grew. What is not known is which program grew: Steam's page processes (our panel, the driver's page
watcher, or Steam itself), or the game. That is the one measurement the Deck still owes (last section).

## What I checked in the screen code, and what it can and cannot say

I read every timer, watcher and animation the plugin's panel keeps after an answer, and ran counting tests on
them (scratch tests, not kept):
- **Timers kept after an answer, all cheap, all stopped when the panel closes:** the game check every 2 s
  (`useOllamaGameContextSync`), the game check every 1.5 s (`useStrategyChecklistSession`), the Show details slot
  measuring every 300 ms (`DetailsSlot`: five box reads, state changes only when the face changes). The answer
  check-in (`useBackgroundGameAi`) stops on "completed". The smooth reveal (`useSmoothStreamReveal`) parks itself
  two beats after it catches up.
- **Counting tests.** The Ask hook streamed an answer then ran 5 simulated minutes: 3 timers alive, 0 back-end
  calls. A full plugin mount idle for 60 simulated seconds: 0 animation-frame requests, 0 page changes, 0 back-end
  calls. The test page has no real layout, so this rules out a timer loop, not a layout loop.
- **Things that could grow and do not:** the debug ring (`bonsaiDebugIngest.ts`) is capped; each back-end call
  clears its timeout timer; no array or string in the Ask hook is appended to on a timer; the knowledge-base status
  timers run only on the AI-models tab (and the idle one only when the library is installed), so the
  library-missing path asks nothing after the answer; the chat sum-up runs only when a chat outgrew its room; read
  aloud is off by default; the verifier second pass is defined but called from nowhere; the only infinite
  animations are the stream-wait pulse and caret (while streaming) and the question box breathing.
- **Library missing specifically.** With no library the back end returns `unavailable=corpus_missing` and attaches
  0 notes. The only screen-side effect I can find is the absence of the notes block. I found no path where a
  missing library makes the panel poll, retry or grow. That path was also in try 2, which did not freeze.
- **What this cannot rule out:** a layout loop (a size watcher that re-measures the panel and writes a style that
  triggers itself, as in the scramble re-wrap of plan 69). jsdom has no layout, so no automated test here can see
  one. The watchers that exist are `useQamPanelHeightGuard` (resize plus a subtree mutation watcher on Steam's
  panel), `useMainTabColumnFill`, `useStreamScrollPin`, `useUnifiedInputSurface`, `useUiScaleProfile`,
  `useHiddenTabHeaderTrap`. With a game running the panel is 854x534 instead of 854x454, which only the real Deck
  exercises. The 2026-10-02 run (same panel, game running, answered fine) argues against a plain layout loop, but
  that run had no page watcher and a different memory state.

## The page watcher, back in play

The Deck driver's script sampled the panel's text every 200 ms on the Quick Access page that night, and was still
installed for the whole of the 17:42 to 17:56 stretch. Try 2 ran a 250 ms watcher of the same kind for 92 s and did
not freeze, but with 9 GB of headroom and the watcher removed after 92 s. A watcher that reads whole-panel text and
runs `querySelectorAll` five times a second forces layout each time, keeps the page's work busy, and with only
about 2 GB free could be what tips Steam's page processes into the swap. It cannot be separated from the panel by
reading the code. Test it directly (last section).

## Memory levers the plugin controls (judged, not built)

**1. The model's keep-alive while a game is running.** Default `ollama_keep_alive` is 5 minutes
(`settings_service.py`; options 0s to 240m). After each answer the model (4.3 GB plus about 0.6 GB for the
16,384-token room, measured 5.8 GB when cold) stays in memory for 5 more minutes while the person is back in the
game. In this freeze that 5.8 GB was exactly what left the Deck with 2 GB. Judgement: this is the strongest lever
that is the plugin's alone, and the plugin already has the pieces: it sends `keep_alive` with every chat request
(`ollama_chat_stream.py`) and knows whether a game is running (`app_context` active). A game-running value of
about 30 s to 1 m would give most of the memory back soon after each answer. The cost is a cold load on the next
question after that (in try 2 the memory had dropped by 5.8 GB within 10 s of Ask; the exact load time
was not logged), and a second question inside the window stays warm. It is a trade of speed for headroom, so it is the maintainer's call, not a silent change. It
would not have prevented this freeze outright, because the memory went at 17:45 to 17:56, but it would have freed
the model by 17:44 and left about 8 GB. It also does nothing about the first question, which still needs the
5.8 GB. Not built: it changes what every game-running person feels, and the cause of the growth is not proven.

**2. Ollama's prompt cache.** The journal line says the cache held "16 prompts, 652.852 MiB" against limits of
8,192 MiB and 16,384 tokens. The plugin does not set any cache limit. How it starts Ollama: either the user
service written by `ollama_local_autostart_service.py` (`ExecStart=<ollama> serve`) or a direct `ollama serve`
from `local_ollama_setup_service.py`. Both set the same environment only: `OLLAMA_VULKAN`,
`OLLAMA_IGPU_ENABLE`, `OLLAMA_FLASH_ATTENTION=0`, `HSA_OVERRIDE_GFX_VERSION`, `OLLAMA_NUM_PARALLEL=1` and
`OLLAMA_MAX_LOADED_MODELS=2` (note: the helper script `scripts/deck-restart-ollama-gpu.sh` uses 1; the plugin's
two paths agree on 2 since plan 48). Whether Ollama 0.34 offers an environment setting or option to cap that
cache **I could not confirm from anything in this repo or without network access**, and I will not guess a name.
Two facts bound the risk: it was 652 MiB after the day's prompts, well under the 8 GiB limit; and the limit is
largest at 16 prompts of up to 16,384 tokens, so a long chat of different prompts could grow it by several
hundred MB more. Judgement: worth capping if Ollama allows it (the Deck can check with `ollama serve --help`,
the release notes of 0.34, and a search of the binary's strings for "cache"), but it is the smaller lever
(roughly 0.7 GB observed against 5.8 GB for the model) and it must not be changed without a Deck measurement of
speed, because the cache is what made the repeat question skip re-reading its prompt. Not built.

**Not a lever:** a smaller room (4,096 instead of 16,384) saves 0.59 GB of 5.8 and brings back the cliff where a
long prompt silently loses its start (`ollama_window_fit.py`).

**Does the plugin check free memory before asking?** No. Nothing in `py_modules` or `main.py` reads
`/proc/meminfo`. A "refuse the question under N MB" guard (the first version proposed about 7,300 MB for a cold
load) is **withdrawn for now**: this freeze happened to a warm model, so a guard on "model not loaded" would not
have fired, and a guard on free memory alone would refuse questions the 2026-10-02 run (about 1,745 MB, answered
fine) shows people can ask. Revisit after the measurement below.

## What the Deck should measure to tell page growth from game growth

All of this can be run without anything crashing, because the sampling is only reads. Do it twice at the same
low-memory state (leave the Deck up for hours, or hold memory with a second program, until about 2,000 to
2,500 MB is available before the question), same game (Deep Rock Galactic: Survivor), same question, library
aside, model warm:
- **Run A: no page watcher, no other test script on the Quick Access page.** Run B: the 200 ms watcher installed
  as on 2026-10-03. If A stays healthy and B freezes, the watcher is the cause and the panel is cleared. If both
  freeze, the panel or Steam itself is the cause. If neither does, the trigger needs the 2 GB state plus something
  else (a longer wait, a second question).
- **During both, every 5 s from before the game launches to 12 minutes after the answer (the freeze took until
  17:56 to be visible, so 12 minutes is the floor), log the resident memory and the processor of each process by
  name:** the game's own process tree, `ollama` (and its runner), Steam's web helper processes (list each by pid,
  with its command line to say which window it is: the Quick Access page is the one with the plugin's page; the
  shared context is another), `steam` itself, and the system totals (`MemAvailable`, swap used, load average).
  `ps -eo pid,rss,pcpu,etime,args --sort=-rss | head -15` every 5 s is enough; also `ollama ps` at the start and
  after the answer.
- **How to read it.** Memory that grows in the game's tree (a steady climb of its resident size) is game growth.
  Memory that grows in one Steam web helper while the game and Ollama stay flat is page growth, and the command
  line says which window; if it is the Quick Access page's helper, the next step is a heap snapshot of that page
  (remote debugging, take a heap snapshot before the question and 3 minutes after, compare retained sizes).
  Ollama flat across the minutes after the answer is already known from the journal.
- **Also read the saved settings** `ollama_keep_alive` and `voice_reply_mode` for the freeze night, and, with the
  panel open on the freeze's state, the page's own count of DOM nodes and its JS heap size
  (`performance.memory.usedJSHeapSize`) before the question, right after the answer and 3 minutes after. A heap
  that climbs while the panel sits idle after the answer is the plugin's page.

## Original first-version findings kept for the record

- A cold question on this model with the 16,384-token room took available memory from 9,145 to 3,410 MB within
  10 s (about 5.8 GB, try 2). Only the keep-alive timer unloads the model; a plugin reload, a game starting or
  quitting, and Stop do not (Stop keeps it loaded on purpose, `ollama_stop_service.py`).
- The first version's "about 85 percent sure it is not the screen" is now lower: about 65 percent. The code reading
  found no runaway timer, but a layout loop and the watcher cannot be excluded without the Deck measurement.
