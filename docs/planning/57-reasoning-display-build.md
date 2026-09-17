# 57 — Building the reasoning display, first version

Written 2026-09-16 by the planning session, before any code. This is the build plan for the roadmap's
**Reasoning display** entry, five stars. It takes the feature plan, [plan 40](40-reasoning-display.md),
and the maintainer's calls (D70, D71 on 5 September; D106 on 16 September, after the mockup page), and
turns them into the exact steps a build session runs. Nothing here is built. The maintainer asked for
this plan to be written in one session and run in another.

Read first: [CLAUDE.md](../../CLAUDE.md); [AGENTS.md](../../AGENTS.md), the table under "Which model
does which work"; [docs/lessons-learned.md](../lessons-learned.md), sections 1, 3 and 4;
[plan 40](40-reasoning-display.md) for the feature and its history; the
[mockup page](https://claude.ai/artifact/2De58qirE34754PEZVPmdb) for what it looks like;
[plan 56 appendix C](56-feature-session-four.md#appendix-c--the-reasoning-contract-kept-for-the-session-that-builds-it)
for the field names the two halves agree on.

**One sentence:** while a thinking model works, the space under your question shows its own newest
three sentences; when the answer starts that folds to one line with the seconds; a press on the line
opens the whole thing; and the chat remembers it.

---

## 1. What is true right now (checked 2026-09-16 against the code)

- **The plugin still throws the thinking away.** The Thinking row on the Ollama tab (Off, Brief,
  Balanced, Deep, default Off) sends the think flag and reserves 256, 512 or 1,024 tokens for it. The
  streaming reader reads only the answer field of each chunk. The thinking field is never read.
- **The line under your question is a composed phrase.** While the answer is being made, the
  background status the screen polls carries one status line. The back end composes it: an opener
  quoting your question, then phrases that escalate as the wait grows, then any short status the
  model itself emits inside a tag. The screen shows it in a muted line with a spinner, only while
  the live turn is open. It is gone the moment the answer lands.
- **The saved chat holds nothing about thinking.** An assistant turn saves its text, the game, the
  thing the question named, a display copy of the question, attachments, a trimmed copy of the Show
  details record, and a time. Turn text is capped at 120,000 characters. The trimmed Show details
  record keeps only its chips, so a new chip added on the back end reaches a reopened chat with no
  screen work.
- **Show details chips need no screen code per chip.** The back end builds the chip list; the screen
  draws whatever is in it. A thinking chip is one more entry in that list.
- **The one-time notice has a pattern to copy.** The beta notice and the on-Deck AI notice each show
  once and remember it in the plugin's browser storage. The thinking notice does the same.
- **Every Show details style control is one shared button.** Helpful, Not really, Read aloud and Show
  details are drawn by one component that makes the button a real D-pad stop and registers it by name
  in the reply's stop list. The folded line is one more of these, placed above the answer.
- **The "thinking tips" entry is already retired.** D70 asked for it; it was removed from the roadmap
  on 5 September. Nothing to do.
- **The Deck was wiped on 16 September** (plan 56). Its Ollama, every model it had downloaded, its
  logs and the knowledge base on the SD card are gone. Nothing in this plan can run on the Deck until
  Ollama and the default model are back, or the Deck is pointed at the PC's Ollama over the network.
- **Plan 40's desk test has not run as a recorded test.** The mockup page needed one capture from
  this PC's copy of the Deck's model: 1,911 characters of thinking in 2.6 seconds for a Hades boss
  question. That capture proved the thinking field arrives and reads as sentences. The rest of the
  test (chunk order, size and speed per level, time to the first answer token) is still owed and is
  step 0 below. **Ran 2026-09-17, see § 10.**
- **The PC's Ollama is version 0.33.3**, well past the version that first split thinking into its own
  field. The Deck's fresh install, when it happens, will be current too.

## 2. What gets built now, and what does not

**Built now (D106, 16 September):**

1. Three live lines at the answer's own text size, showing the newest sentences of the reasoning,
   newest at the bottom and slightly brighter. Never more than three. The composed phrases fill the
   silence until the first thinking chunk arrives, and stay as the whole story with thinking Off.
2. When the answer starts, the three lines fold to one row above the answer that reads
   *Show reasoning · 41 s*, drawn exactly like the Show details row. Seconds only. A D-pad stop.
3. A press on the row opens the whole reasoning as a muted block above the answer, and the row reads
   *Hide reasoning · 41 s*. A press closes it. Closed by default, always, including on reopen.
4. Live in Strategy mode too, unmasked. One notice with a confirm the first time Thinking is turned
   on: *"Thinking shows on screen as it happens and is not checked for spoilers. Show it?"*
5. Saved with the chat, capped, so a reopened chat still has the fold and it still opens.
6. One chip in Show details: *Thinking: Balanced · 41 s · ~380 tokens*. The token count is an
   estimate and lives on the chip only.
7. Nothing changes with thinking Off, or on a model that cannot think.

**Not built now, on purpose:**

- The folded line in a character's own voice. Its own two-star roadmap entry; builds only after this
  first version has landed and been looked at.
- The second job, where the model weighs spoilers inside its thinking and ends with a verdict the
  Spoiler risk chip reads. Waits with the voiced line, as D106 says. Plan 40's rows T3 and T6 wait
  with it.
- Any change to the thinking levels, budgets, or the composed phrases themselves.

## 3. Before any code

### 3a. The desk test, about an hour plus model time

The one running the session does this on the PC, with this PC's copy of the Deck's default model
(the small Gemma 4 build). A short script talks to the PC's Ollama directly with thinking on, streams
three questions at each of the three levels, and writes every chunk with its field and a timestamp to
a file. Questions: a quick fact question, a Strategy question with cards, and an Expert one.

What it answers, and why it matters to the build:

| # | Question | Decides |
|---|---|---|
| T1 | Does all the thinking arrive before the first answer chunk, or does some weave through? | The reader's order rule is already written for both cases (a late thinking chunk is appended, the fold stays folded). This confirms which case is common. |
| T2 | How many characters of thinking per level, and how many seconds? | Whether three lines keep up at Brief, and whether the saved-text cap holds a whole Deep think. |
| T4 | How long from the first thinking chunk to the first answer chunk? | How much silence the three lines are actually filling, and the seconds the fold will typically show. |
| T5 | How often does the model think and then write no answer? Run the existing answer test on the PC with Thinking at Balanced and at Deep, and count the empty replies per level. | The maintainer's worry (D108 item 3): thinking must not make the plugin worse to use. If any level comes back empty more than about one time in twenty, the fold shows beside the error line in this build (section 7, item 4), and the cause goes on the roadmap as a bug. |

The capture files are also the test fixtures for step 1: the faked streams in the back-end tests
should be real chunks from this run, not invented ones. Evidence goes under `docs/test-evidence/`
with a `plan57-` prefix.

### 3b. The Deck check

Before step 6, find out whether the Deck has Ollama and the default model back after the wipe. If not,
either the plugin's own *Install Tier 1 essentials* button puts them back, or the Deck rows run against
the PC's Ollama over the network. Only REASONING-01 (the feel of the live lines on the Deck's own
hardware) truly needs the Deck's own Ollama. See the questions in section 7.

### 3c. The device measurement, before the screen step

The routing rule says screen and focus work starts only after a measurement on the device. The one
needed here: with a live turn open on the built-in screen, how much of the transcript a 50-pixel
block plus a 15-pixel fold row leaves for the answer, and whether the fold row's ring is visible
above the dock when the D-pad lands on it, not just focused. This can be measured on the Deck against
the PC's Ollama over the network, or with the mockup's own sizes drawn into a test build.

## 4. The build, step by step

One thing per commit, every gate green between commits. The session runs on Opus at extra-high effort
and writes no code itself except the screen step; lanes are Sonnet 5 at high effort in their own copy
of the repo. Lanes hand back code, tests and a short report only. They never edit the roadmap, the
testing documents or the changelog.

| Step | What lands | Who | Waits for |
|---|---|---|---|
| 0 | The desk test (3a). The Deck check (3b). | the session | nothing |
| 1 | **Back end.** The streaming reader keeps the thinking field in its own buffer. It stamps the first thinking chunk and the first answer chunk. While the answer is pending it publishes the newest 600 characters and the seconds so far into the partial-stream snapshot the screen polls, on every delta, not only at the end. When the answer completes it returns the whole text (capped), the seconds, and a token estimate, and those reach the finished status, the Show details record (as the chip), and the saved turn. A soft continue (the model ran out of room and was asked to go on) keeps one buffer across both requests and counts seconds from the first. Tests with faked streams from 3a: thinking then answer; a thinking chunk after the first answer chunk; thinking only, no answer; no thinking at all; a cut-off stream; a soft continue. | Sonnet 5 high, lane A | step 0 |
| 2 | **Screen, the one-time notice.** The first time Thinking is moved off Off, a confirm shows the notice (wording in section 7). Accepting sets the level and remembers the notice in browser storage, the way the beta notice does. Declining leaves Thinking Off. The Thinking row's help text says what thinking shows on screen. Tests: shows once; never a second time; declining keeps Off. | Sonnet 5 high, lane B | nothing; runs beside lane A |
| 3 | **Screen, the display.** The status and result types gain the new fields. The live three-line block at the answer's size replaces the composed phrase the moment the partial text is non-empty. When the answer starts, the fold row appears above the answer bubble and the block goes. A press opens the muted block and flips the label; a press closes it. The same fold on reopened turns from the saved chat; older turns with no saved reasoning show nothing. The fold is a registered reply stop: Down from the question's Retry lands on it, Down again enters the answer; B anywhere closes an open block. Focus-graph entry in the section parent first. Tests for each state, and a test that the block never renders a fourth line. | Opus extra-high, with the measurement from 3c in hand | step 1 (field names), 3c |
| 4 | **Docs.** The roadmap entry moves to Verify naming the rows in section 6; the rows go into the manual testing doc; a changelog line; plan 40's log and this plan's log. | bookkeeper | steps 1 to 3 landed |
| 5 | **The Deck rows** in section 6, plus the free-play sweep, since this changes the Main tab. | whoever holds the Deck; Opus reads any failure | step 4, and 3b answered |

Lane A and lane B can start together. Step 3 can start against the agreed field names before lane A
lands, with a faked status, but it should not land before lane A has.

## 5. The screen, exactly as drawn

Taken from the mockup page so nobody builds from a description. All widths are inside the 300-pixel
column; the content row is 267 pixels wide.

- **The live block:** 267 wide; a 2-pixel muted left border; padding 2 top and bottom, 8 left, 4
  right; three rows, each 16.8 pixels tall (12-pixel text at 1.4 line height), one line each, cut with
  an ellipsis when too long; the two older rows in the muted blue the status line uses today; the
  newest row brighter. The whole block is about 50 pixels tall, the same room as three answer lines.
- **The fold row:** the Show details row's own style: a 1-pixel rule either side, the label at 10
  pixels, weight 600, letter-spaced, in the muted blue; the ring is Steam's own. It sits between the
  question header and the answer bubble, with 4 pixels above and 2 below. Closed it reads
  *Show reasoning · 41 s*; open it reads *Hide reasoning · 41 s*. Whole seconds; under one second
  shows *1 s*.
- **The opened block:** 267 wide; the answer chunk's own dark surface with a faint 1-pixel border and a
  6-pixel radius; 8 pixels of padding; 6 pixels below it; 11-pixel text at 1.4 line height in the
  muted blue; line breaks kept as the model wrote them. No masking inside. No spinner.
- **The chip:** *Thinking: Balanced · 41 s · ~380 tokens*, with the body saying the token count is an
  estimate because Ollama's count does not separate thinking from the answer.
- **Nothing** for a turn where the model did not think: no block, no fold, no chip.

## 6. Proving it on the Deck

Plan 40's rows, trimmed to the first version. Frozen chips to confirm before pinning: *how do i kill
the big armoured bug boss* (Deep Rock Survivor; rows 01, 02, 05); *how does the story end* (Red Dead
Redemption 2; row 06); *what does the pickaxe do* (row 04).

- **REASONING-01** Thinking Balanced, the default model, a Strategy question: the space under the
  question changes to the model's own sentences within a few seconds, three lines at the answer's
  size, never more.
- **REASONING-02** When the answer starts, the space folds to one line with the seconds; Down from the
  question reaches it and the ring is visible above the dock; A opens the block, A closes it; Down
  from the fold enters the answer.
- **REASONING-03** Reopen the chat after switching tabs and after a plugin restart: the fold is there,
  closed, and opens to the same text with the same seconds.
- **REASONING-04** Thinking Off: today's phrases, no fold, no chip.
- **REASONING-05** Show details on a thinking turn: the chip reads the level, the seconds and the
  token estimate, and its body says the count is an estimate.
- **REASONING-06** Red Dead, Strategy, the ending question, first time with thinking on: the notice
  appears and asks to confirm; the live lines may name the ending; after the answer starts, nothing
  of the reasoning shows outside the closed fold.
- **REASONING-07** Decline the notice: Thinking stays Off and nothing shows. Accept it on a later try:
  the level changes and the notice never returns.
- **The focus-graph checklist** in the manual testing doc, for the new stop.
- **The free-play sweep.**

## 7. Decisions and questions still open

The maintainer's calls from 5 and 16 September cover the shape. These are the small things the plan
had to pick or could not, with the default the build uses unless told otherwise.

1. **The Deck has no Ollama and no models since the wipe.** **Answered 2026-09-16: the maintainer
   put Ollama and the models back**, so the Deck rows run on the Deck's own model. Still to check
   before step 5: the knowledge base on the SD card was wiped too, and rows 01 and 06 ask Strategy
   questions that use its cards, so download it again first. Items 2 to 6 are written up with
   options and the planner's lean as D108 in the decisions file.
2. **The notice's wording.** **Answered (D108, option 2): one line.** *"Thinking shows on screen
   as it happens and is not checked for spoilers. Show it?"* Buttons: *Show thinking* and *Keep it
   off*.
3. **Declining the notice.** **Answered (D108, option 1):** Thinking stays Off, nothing else
   changes, and the notice returns the next time Thinking is moved off Off.
4. **When the model spends its whole thinking budget and writes no answer.** The plugin already
   asks it to go on. If it still writes nothing, today's error line shows. **Answered (D108, option
   1, with a condition):** the fold appears only on a turn with an answer. The maintainer's worry is
   how often this happens, because thinking must not make the plugin worse to use. So T5 in section
   3a counts empty replies per level before the screen step. If any level comes back empty more
   than about one time in twenty, the fold shows beside the error line in this build after all,
   and the cause goes on the roadmap as a bug.
5. **The saved-text cap.** **Answered (D108, option 1):** 6,000 characters, so a whole Deep think
   fits; the live window stays 600. When a think is cut, the end is kept and a one-line note at the
   top says the start was cut.
6. **Order against the session-context tab.** **Answered (D108, option 1):** this plan runs first,
   on its own; the tab is its own session after this has landed.

All six are answered. Nothing in section 4 waits on anything now except the knowledge base check
before the Deck rows and the T5 count before the screen step.

## 8. Risks, and what to know

- **Thinking is Off by default**, so most people see none of this until they turn it on. The row's
  help text (step 2) is where they learn what they get.
- **Reasoning can spoil, and it is shown live in Strategy mode by choice.** The notice is the fence
  before the fold exists. The closed fold is the fence after.
- **The fold is a new D-pad stop inside the reply**, on the Deck's hardest surface. The measurement
  comes first; the focus-graph entry comes before the code; the ring must be visible, not just
  focused.
- **The live text must be in the polled snapshot, not only the final result.** A field that arrives
  only at completion reaches the screen only when the answer completes (plan 54 needed a fourth
  commit for exactly this).
- **A late thinking chunk after the answer has started** is appended to the buffer; the fold stays
  folded and its seconds do not change.
- **Long reasoning grows the chat file.** The cap bounds it.
- **The model's own status tag** still gets asked for in the prompt with thinking on. Once the live
  lines exist it is wasted tokens on a thinking model. A later tidy, not this plan.

## 9. Out of scope

The voiced fold; the spoiler verdict and everything under plan 40's second job; reading the reasoning
aloud; showing reasoning on the toast; summarising the reasoning with a second model call; masking
words inside the reasoning; the session-context tab; any prompt or budget change.

## 10. Progress log

Written as work lands.

- **2026-09-16** — Plan written from plan 40, D106 and the mockup page, against the code as of
  commit 04bfb6d. Nothing captured, nothing built. Six questions in section 7, all with defaults.
- **2026-09-16, later** — All six answered. The maintainer put Ollama and the models back on the
  Deck; the other five are D108, locked the same day: the one-line notice, declining keeps Off, no
  fold on an empty reply unless T5 shows empties are common, 6,000 characters kept, this plan
  before the session-context tab. T5 added to the desk test for that worry. Nothing built.
- **2026-09-17** — Built and landed on `experimental`.

  **The desk test (§ 3a) ran on the PC.** Nine streams, three questions at each of Brief, Balanced
  and Deep, on the Deck's own default model. In every run the thinking finished arriving before the
  first word of the answer showed up — nothing had to weave the two together. Thinking ran from about
  1,370 to 2,705 characters at every level; the wait between the first thinking word and the first
  answer word ran 2.1 to 4.1 seconds on this PC; no answer came back empty. One Brief-level, Expert
  question hit the length cap and needed the soft-continue path to keep going. Evidence
  `docs/test-evidence/plan57-desk-*.jsonl`, `docs/test-evidence/plan57-desk-summary.json`.

  **T5, the empty-reply worry from D108 item 3, ran on the PC:** the existing answer test, 61 cases
  times 3 samples, at Thinking Balanced and at Deep. Zero empty replies out of 183 tries at either
  level. **So the fold does not show on a blank turn in this build — D108 item 3's option 1 stands,
  decided.** Alongside it: Balanced got 132 of 171 facts right, 36 of 61 cases fully clean, in 9.8
  minutes; Deep got 139 of 171 facts, 40 of 61 clean, in 10.4 minutes; both a little better than the
  same test with thinking off on 2026-09-07 (123–136 of 171 facts, 37–41 of 61 clean, in 4–5 minutes)
  — thinking costs time and buys a small accuracy gain. Reports
  `docs/archive/research/kb-answer-eval-2026-09-17-plan57-t5-balanced.md`, `…-t5-deep.md`.

  **The device measurement (§ 3c) ran on the built-in 1280x800 screen.** At rest the chat window is
  143 pixels tall. With the ring on the newest turn's Show details row, that row sits fully above the
  dock. With the question header and the new fold row at the top, about 94 pixels (five and a half
  lines) are left for the answer; with the 50-pixel live thinking block showing instead, about 61
  pixels are left. Evidence `docs/test-evidence/plan57-M-fold-row-and-live-block.json`.

  **Three landings.** Lane A, the back end, keeps the model's thinking and carries it through:
  commits `a4fbf81`, `0551307`, `ac8d7eb`, `1f879a5` (the last also puts it in Show details and the
  saved chat). Lane B, the one-time notice and the Thinking row's help text: commits `ae26454`,
  `57138ae`. Lane C, the live three lines, the fold row, the opened block, the stop and the
  focus-graph entry, with two more tests: commits `4c014f0`, `81f5847`, `ba00dc0`, `c5b046d`. **A
  follow-up commit, `fefca07`, passes the thinking through the request layer** — without it the
  finished answer and the saved chat carried no reasoning at all.

  **A trap found while landing:** inside a copy of the repo made by the copy helper, the refactor
  ratchet's two copy-paste counts read 0, so a lane's own gate passed in its copy and the same commit
  then failed the ratchet in the shared checkout. Found when a back-end lane's first commit landed and
  the tests' copy-paste count went 2113 → 2123. Fixed with a follow-up commit sharing the test setup.

  **A finding from the device measurement, filed as a bug on the roadmap:** pressing B while the Show
  details panel is open does not close it; Steam's own Back instead moves the highlight up to the tab
  row. The reply has no B handling for this panel today. Needs a decision on whether B should close
  the panel or this is accepted as it is.

  **Still owed on the Deck:** rows REASONING-01 to REASONING-07, the focus-graph checklist, and the
  free-play sweep.

---

## Appendix A — for the helpers, not for reading

Exact names the lanes build against. Plain words above; this part is for the briefs.

**Field names (plan 56 appendix C, kept):**

- Pending status (`get_background_game_ai_status`, the partial-stream snapshot in `main.py`):
  `reasoning_partial` (newest 600 chars or null), `reasoning_seconds` (whole seconds since the first
  thinking chunk, or null).
- Finished status and the Ollama result dict: `reasoning_text` (capped at 6,000 chars, "" when none),
  `reasoning_seconds` (first thinking chunk to first answer chunk), `reasoning_tokens`
  (`len(text) // 4`).
- Saved turn (`chat_slot_service._normalize_turn`): `reasoning` as `{text, seconds, tokens}`, capped
  the same way; missing on older turns.
- Chip: built in `transparency_service.build_ollama_route_snapshot` beside the *Reply style* chip;
  label `Thinking: {level} · {seconds} s · ~{tokens} tokens`.
- Browser storage flag for the notice: `bonsai:thinking-notice-accepted-v1`, next to
  `bonsai:disclaimer-accepted` in `useDisclaimerAndLocalRuntimeGates.tsx`.

**Lane A owns:** `py_modules/backend/services/ollama_service.py` (the chunk handler at
`_apply_stream_obj`, which reads `message.content` and must also read `message.thinking`; the
result dict at the end of `post_ollama_chat`; the soft-continue loop in `ask_ollama`),
`py_modules/backend/services/ollama_ask_service.py` (`_on_delta`), `main.py`
(`_update_partial_response`, the completed-state dict, `_chat_slots_record_assistant_turn`),
`py_modules/backend/services/background_request_state.py`,
`py_modules/backend/services/chat_slot_service.py`,
`py_modules/backend/services/transparency_service.py`, and their tests.

**Lane B owns:** `src/components/OllamaThinkingEffortRow.tsx`, `src/components/OllamaTab.tsx`,
`src/data/askThinkEffort.ts` (the description strings), a new hook beside
`useDisclaimerAndLocalRuntimeGates.tsx`, and their tests.

**The screen step (Opus) owns:** `src/types/backgroundAsk.ts`, `src/hooks/useBonsaiAskOrchestration.ts`
(state from the poll and the result; the live-turn snapshot that survives a panel close),
`src/components/MainTabChatTranscript.tsx` (the live status line around line 1136 becomes the
block; the fold between the turn header and `buildAnswerBubbleElement`), `src/utils/replyStopRegistry.ts`
(a new stop id in `REPLY_STOP_ORDER` between Retry and Copy), `src/utils/liveTurnFocusGraph.ts`,
`src/types/bonsaiUi.ts` (`AskThreadCollapsedTurn.reasoning`), the turn conversion from saved slots,
`src/styles/sections/section-6.ts`, and their tests.

**Every brief carries:** the tip hash and the base check (a copy can spawn hundreds of commits
behind; verify before the first edit); the copy's packages folder is a link, so no install step;
one change per commit; the gates from AGENTS.md (`npm test`, `npm run test:py`, `npm run build`,
`python scripts/verify.py --quick`; the focus pattern check runs inside the build); the focus law
for anything on the Main tab; and the rule that lanes never touch the roadmap, the testing docs, the
changelog or the Deck.
