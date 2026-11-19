# 108b — Dynamic keep-alive and smart unload: the plan

**Status: READY for the maintainer's read, 2026-11-19. Planning only; nothing is built.** The roadmap entry asks for
a test before anything is built. Reading the code showed that most of the idea has been built since, in three
pieces, without that test. This plan says what is left, starts with the test, and keeps the build small.

**Where to pick up.** Read §§ 1 to 5. Answer calls b1, b3, b4 and b7 in § 4 (b2 waits for the test's numbers; b5 and
b6 wait for a drawing). Then say "Run plan 108b" in a new chat on the PC. The first act is one block of readings on
the Deck (§ 5, step 0). It needs no new code.

**Files for this plan:** the briefs, [assets/108b-lane-briefs.md](assets/108b-lane-briefs.md); the shared helper
rules, [assets/108-helper-rules.md](assets/108-helper-rules.md). Evidence files: `plan108b-<ROW>.json` in the
workshop's test-evidence folder. Its sister plans are 108a to 108g. Its calls are filed under decision D145 as b1 to
b7. Its rows start `P108B-`.

**The roadmap entry:** ★★★ `[ollama]` **Dynamic keep-alive / smart unload** — "OPEN, research spike. Hold models
loaded, or unload when a game takes focus on the Deck APU? The spike decides go or no-go; no production unload
before it. Pairs with 'What bonsAI costs a running game'."

Written by a planning chat (Fable 5.2) on `experimental` at tip `28306e896`, from the roadmap entry and its long
notes (no older plan or study exists for this item), the locked calls of plans 89 and 104, a read of the code as it
is today, and four reading commands on the Deck (2026-11-19).

---

## 1. What you would notice when this is done

- **You ask a question with no game running, then start a game.** Today the AI can stay in the Deck's memory for as
  long as the "Keep models loaded" slider says: five minutes as shipped, up to four hours. The game then starts
  with about 5.9 GB less memory than it could have. After this plan the Deck's own AI lets go as the game starts.
- **You press "Ask anyway" beside a heavy game.** Today the AI stays for a minute after the answer. After this plan
  it leaves when the answer ends.
- **The Ollama tab says what happens.** Today the slider can say 15 minutes while bonsAI quietly uses one minute
  because a game is running. Only the log says so. After this plan the row says it in plain words.
- **Perhaps, if the test says it is worth it:** beside a light game that leaves plenty of memory, the AI stays ready
  for longer than a minute, so a second question starts fast instead of loading the AI again.
- **Nothing changes when the AI runs on a PC.** bonsAI never unloads a model on someone's PC, and the game rule
  never applies there.

## 2. What was already written down, and what has gone stale (checked against the code on 2026-11-19)

No plan and no study exists for this entry. The older writing is the entry itself, its three-line note as filed
([long notes](../roadmap-details.md#ask--reply-items-with-short-entries-as-filed)), its sister entry, and the notes
of work that was built around it.

**Still true**

- Nobody has timed a cold start (the AI must first be loaded from disk) against a warm one (it is already in
  memory) for the Deck's everyday model with a game running. Two numbers exist and neither answers it. A small test
  model started 2.3 seconds sooner warm than cold (7.7 against 10.1 seconds, no game, 2026-09-23). The very first
  question after a fresh install waited 95 to 120 seconds.
- Nothing in bonsAI notices a game starting. It learns that a game is running only at the moment you ask.
- The pairing with "What bonsAI costs a running game" holds: same Deck, same games, same memory numbers.

**Stale**

- **"No production unload before the spike."** Overtaken by your own call on 2026-10-11 (plan 89, call 8 of
  [D128](../audit/maintainer-decisions-locked.md#d128--locked-2026-10-11-raised-2026-10-11--plan-89-the-bug-list-and-the-verify-list-as-close-to-empty-as-they-can-get-the-fifteen-calls)):
  with a game running and the AI on this Deck, bonsAI asks for one minute instead of the slider's time. It passed on
  the Deck the same night: the AI left memory about 65 seconds after the answer (row P89-KEEPALIVE-GAME, closed).
- **"Hold models loaded, or unload?"** is no longer one question with one answer. A slider has held the AI since
  April: thirteen stops, from "let go at once" to four hours. The one-minute rule shortens it. Since 2026-11-15 a
  warning stands in front of a load into too little memory
  ([D141](../audit/maintainer-decisions-locked.md#d141--locked-2026-11-14-raised-2026-11-14--plan-104-the-knowledge-base-wave-seven-the-thirty-one-calls),
  calls 9 and 21). Stop keeps the AI loaded since 2026-09-26, and since 2026-11-19 a Stop before the first word
  cancels the load.
- **"The memory safety check stays unbuilt"** (a note of 2026-09-26): it was built on 2026-11-15, as above.
- **"Research spike" as the whole entry.** The test is still owed, but it is now one step of a small build, not a
  gate in front of everything.

**Never written down** (found by reading the code)

1. A question asked before a game starts leaves the AI loaded for the slider's full time. The one-minute rule cannot
   help, because it only looks when a question is asked.
2. The rule is one minute for every game, light or heavy. A light game could spare the memory for longer; a heavy
   one is squeezed for that minute.
3. Nothing on screen says the rule exists.
4. The warm-up at start-up (a Developer switch) and the warm-up after an install send no hold time at all. Ollama's
   own five minutes applies to them, whatever the slider says.
5. The slider is labelled "Keep models loaded" on screen. Notes and test rows call it "Unload delay". They are the
   same control.

## 3. How it works today

- **Who decides how long the AI stays.** bonsAI does, on every request. Each request to Ollama says "keep this model
  for so long", and Ollama obeys the last request it got. The value is the slider on the Ollama tab: five minutes
  unless you moved it. This Deck's slider is at five minutes today (read from its log).
- **The Deck's own AI with a game running:** one minute, unless the slider is already shorter. "A game is running"
  means the panel named a game at the moment you asked.
- **The AI on a PC:** the slider's value, always. The Deck's game does not matter there. bonsAI never unloads a
  PC's model, not even on Stop.
- **Before the Deck's AI loads:** bonsAI reads free memory. If loading would leave under 2,000 MB it warns and
  offers "Ask anyway".
- **Stop:** ends the answer and keeps the AI loaded. A Stop before the first word cancels the load.
- **The memory numbers already measured on this Deck** (2026-11-15): 11,962 MB free with nothing running; 5,649 MB
  with the AI and its small search helper loaded, so the AI itself takes about 5.9 GB; 8,682 MB with Deep Rock
  Galactic: Survivor running; 4,885 MB with God of War running, plus 2,172 MB already pushed out to the Deck's
  overflow space (swap). A light game and the AI together leave 2.4 to 2.8
  GB. God of War and the AI together do not fit.
- **Read on the Deck today:** Ollama 0.40.16; nothing loaded; 11,800 MB free; the file that starts the Deck's
  Ollama sets no hold time of its own.

## 4. Calls for you before anything is built

Filed under D145. "Warn, with Ask anyway" (D141 calls 9 and 21) stands as it is. **One call touches a locked one:**
b2 would change the one-minute rule (D128 call 8) if you pick (b) or (c). Its choice (a) keeps that call as locked.

**b1. When a game starts and the Deck's own AI is still in memory, let it go?**
(a) Yes, always, with no new setting. (b) Yes, with a new switch on the Ollama tab. (c) No, leave it.
**Recommended: (a).** A game needs the memory more than you need a warm AI at that moment, and the one-minute rule
would let it go soon after your next answer anyway. A switch costs about 18 files and a drawing, for something few
people would turn off. If an answer is being written when the game starts, it finishes first. *Unanswered: nothing
is built for this.*

**b2. How long the AI stays after an answer while a game runs.** Today: one minute, for every game.
(a) Keep one minute. (b) By room: the slider's own time when the game leaves plenty of memory, one minute when it
does not. (c) Let go the moment the panel closes.
**Recommended: decide after step 0.** (b) only if the test meets both lines in § 5; otherwise (a). (c) would make
nearly every second question a cold start. *Unanswered: (a), nothing changes.*

**b3. After "Ask anyway", let the AI go when the answer ends?** (a) Yes. (b) No, keep the minute.
**Recommended: (a).** You were just told memory is short. Holding the AI for another minute is the risky part.
*Unanswered: (b).*

**b4. Which models are let go when a game starts?** (a) Everything loaded in the Deck's own Ollama. (b) Only the
models bonsAI itself has used since it started.
**Recommended: (a).** bonsAI set that Ollama up, and the point is the game's memory. (b) matters only if you run
another program against the Deck's Ollama; if you do, say so and it is (b). Nothing on a PC, in either case.
*Unanswered: (a).*

**b5. What the Ollama tab says about all this. Needs a drawing first** (mock-up board 7, tab "108b"). Drawn: today's
line; a plain line that names the game rule; the slider's own value showing the rule while a game runs.

**b6. A "free the AI's memory now" button. Needs a drawing first** (same tab). **My lean: not now.** With b1 built
the Deck does it by itself at the moment it matters, and the slider's first stop already means "never hold". A new
button on that tab is real D-pad work.

**b7. One risky reading in step 0: starting God of War on top of a loaded AI.** (a) Skip it; the sum is enough.
11.9 GB free, less 5.9 for the AI, leaves 6.0; God of War took 7.1 and still swapped. (b) Run it last, with the AI
unloaded the moment free memory falls under 1,500 MB.
**Recommended: (a).** A frozen Deck needs your hands to restart. *Unanswered: (a).*

## 5. The build, in order

**Step 0, the test to find out.** One Deck block, about an hour, no new code. Its runbook is section S0 of the
briefs. Six readings:

1. The wait for the first word, warm against cold, with no game.
2. The same beside a light game (Deep Rock Galactic: Survivor, in a mission).
3. What the light game loses while the AI sits loaded but idle: frames a second, free memory, swap.
4. Starting the light game on top of a loaded AI, against starting it clean.
5. Whether Steam's "a game started" notice reaches bonsAI's side with the panel closed.
6. If time allows: whether a loaded AI survives two minutes of sleep.

**The lines, set before anything is measured**

- **Holding longer beside a light game (call b2, choice b) is a go only if both hold.** One: beside the game, a cold
  start costs at least 20 seconds more than a warm one. Two: the idle AI costs the game nothing we can see, meaning
  the game stays within 2 frames a second of its rate without the AI, at least 3,000 MB stays free, and the
  overflow space (swap) in use grows by less than 200 MB over five minutes. **No-go** if the cold start costs under
  10 seconds more. Between 10 and 20 it is your call, with the numbers in front of you.
- **Letting go at game start (call b1) needs only reading 5.** The notice must arrive within 5 seconds of the
  launch, with the panel closed, three launches out of three. If it does not arrive, lane A stops and comes back to
  you with the second route (bonsAI's background part looks for a running game by itself), which costs more.
- Readings 3 and 4 also feed the sister entry's open question, whether to say plainly what a question costs.

| Step | What a person gets | Stars | Who builds it | Waits on | Check |
|---|---|---|---|---|---|
| S0 | The numbers above | none | Deck driver (Sonnet medium); the session reads the results | nothing | P108B-S0 rows |
| M | The drawing for calls b5 and b6 | ★ | Mock-up helper (Opus, medium or high) | nothing | your pick on the page |
| A | A starting game gets the AI's memory back | ★★ | Sonnet high | S0 reading 5; b1; b4 | P108B-GAME-START-01, -02, -PC |
| A2 | After "Ask anyway" the AI leaves when the answer ends | ★ | Sonnet high | A landed; b3 | P108B-ASK-ANYWAY-01 |
| P | The two warm-ups obey the slider | ★ | Sonnet medium | nothing | P108B-WARMUP-01 |
| D | The Ollama tab says what happens | ★ for words; ★★★ with a button | Sonnet medium for words. Opus extra-high, after a Deck measurement, for a button | M picked; b5; b6 | P108B-TAB-LINE-01 |
| B1 | Beside a light game the AI stays ready longer | ★★★ | Sonnet high | both lines met; b2 is (b); A2 landed | P108B-ROOM-HOLD-01 |
| B2 | A held AI lets go if memory runs low | ★★★ | Sonnet high | B1 and A landed | P108B-LOW-MEMORY-01 |
| S1 | The Deck checks of what landed | none | Deck driver (Sonnet medium) | lanes landed | § 6 |

**The order.** S0, M and P start together, at once. A follows reading 5. A2 follows A, because they share one new
file. D follows your pick on the drawing. B1 and B2 are built only if the test meets both lines and you choose
(b) for call b2; they go one after the other, never together. If the test says no-go, the plan ends after A, A2, P
and D, and the entry closes with the one-minute rule as its answer.

## 6. The checks

**The rig can run these** (on the Deck, with a memory read over SSH beside each):

- **P108B-S0-COLD-WARM, -IDLE-HOLD, -GAME-START, -NOTICE, -SLEEP.** Step 0's readings. A pass means "measured as
  written", not a product result.
- **P108B-GAME-START-01.** Ask with no game (slider at 15 minutes for the check, put back after). Close the panel.
  Start Deep Rock Galactic: Survivor. Must see: nothing loaded within 15 seconds of the launch, free memory up by
  about the AI's size, and one log line saying why.
- **P108B-GAME-START-02.** Start the game while a long answer is still being written. Must see: the whole answer in
  the chat, never cut short, and the AI gone within 15 seconds of its last word.
- **P108B-GAME-START-PC.** The AI on the PC, with a model loaded there. Start a game on the Deck. Must see: the PC's
  model still loaded, and a log line saying nothing was done.
- **P108B-ASK-ANYWAY-01.** A light game, with the warning forced by the test switch as P104-MEMORY-02 did. Press Ask
  anyway. Must see: the AI gone within 15 seconds of the answer's end. Never run beside a heavy game.
- **P108B-WARMUP-01.** Developer warm-up on, slider at 15 minutes, the plugin restarted with **no game running**.
  Must see: the warmed model due to leave about 15 minutes out, not 5.
- **P108B-TAB-LINE-01.** The Ollama tab shows the picked words, on both screens, with the look check (QA-LOOK-01)
  for that tab. If a button was picked: a D-pad row for its stop, there and back.
- **P108B-ROOM-HOLD-01, P108B-LOW-MEMORY-01.** Only if B1 and B2 are built. The AI still loaded three minutes after
  an answer beside the light game; and gone within 20 seconds once the watcher's line is raised by its test switch.

**Only you can do this one** (for the "checks only you can do" page):

- **P108B-HAND-01, an evening's feel.** Ask with no game, start a heavy game, play five minutes, ask again in the
  game. Is the wait for that answer acceptable? Did the game start as smoothly as it does with bonsAI unused?

No Main-tab change is planned, so the free-play sweep is not owed. The look check is owed for the Ollama tab only.

## 7. What could go wrong, and what stops the work

- **An answer cut short.** Letting go while the AI is still writing would end the answer. Lane A waits until no
  question is pending and the AI's worker has gone quiet, then acts. A test proves both directions.
- **A cold start you did not expect.** After b1, a question asked just after a game starts loads the AI again. That
  is the trade this plan makes, on purpose; step 0 puts a number on it.
- **The notice does not arrive, or arrives for things that are not games.** Reading 5 settles the first. For the
  second, the worst case is one needless cold start.
- **Someone else's Ollama.** Nothing in this plan sends an unload to a PC. Lane A talks to the Deck's own address
  only and takes no address from the screen, so it cannot be pointed elsewhere.
- **A frozen Deck during the test.** The AI is unloaded before every game launch except reading 4, which uses the
  light game only. God of War is never run beside a loaded AI unless you choose (b) for call b7.
- **Numbers that mean nothing.** A repeated question is answered from memory and measures nothing. Step 0 times the
  load with a direct request to Ollama, and every panel question in it is worded differently.
- **The other chat.** Plan 107 (bugs and owed checks) is likely to take two neighbours: the Verify entry on a
  question beside a heavy game, and the one-star bug on the "Ask anyway" button. This plan fixes neither. Lane A2
  works next door to them and is re-checked against whatever plan 107 lands.
- **What stops the work:** reading 5 failing (lane A returns to you); either line of the test failing (no B1, no
  B2); a Deck freeze in step 0 (the block ends, the readings so far are kept).

## 8. Not in this plan

- Any unload of a model on a PC, by a button or by a rule.
- A new setting for how long to hold with a game. The slider stays the one control.
- Loading the AI ahead of a question for everyone. The Developer warm-up stays a Developer switch.
- What an answer costs a game while it is being written, and saying so on screen. That is the sister entry.
- The freeze beside a heavy game and the "Ask anyway" button's look. Those are plan 107's.
- Picking a smaller model for you when memory is short.
- Sleep: reading 6 only finds out what happens. Acting on it would be a new entry.

## 9. For the one running the session

- **First acts at go.** Re-check every section of the briefs against the tip (line numbers are from `28306e896`).
  Run `git status` and list `docs/planning/` for other chats' plans; read plan 107's lane list for the two
  neighbours named in § 7. Read the usage counters before each batch of helpers. Before the Deck block, read the
  Deck's status for another driver and ask for the window.
- **Your model.** Three stars: Opus at extra-high plans, reads the Deck's numbers and lands. You write no code.
- **Helpers.** Eight to ten runs in all: the driver twice (S0, S1), the mock-up helper, lanes A, A2, P and D, and
  B1 and B2 only on a go. At most three at once; A, A2, B1 and B2 share files and run one after another.
- **Reviewers.** None is required by the rules: no new disk read, permission, download or microphone, and no new
  dependency. Ask the security reviewer one question on lane A all the same (briefs, last section). Ask the second
  opinion before landing lane D if it carries a button, as before any D-pad landing.
- **The bookkeeper is handed:** D145's b calls with your answers, word for word; the roadmap entry reworded as
  PARTIAL now, moved to Verify with its rows when lanes land; the rows of § 6 opened in the testing files; step
  0's numbers added to the sister entry's long notes. Details: briefs, section K.
- **Stars.** The roadmap's three stars still fit: four small lanes and one conditional pair that carries the risk.
- **At the end,** the two write-ups the maintainer asked for: the code-work summary (files changed, what surprised
  you, what would have made it easier), and a plain "how it was built" guide to this plan in the code.
