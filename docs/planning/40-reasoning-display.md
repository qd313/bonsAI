# 40 — Showing the model's real thinking, and giving it a second job

Written 2026-09-05, before any code; reworked the same day after the maintainer's answers. The third
of the six features the maintainer picked to plan. The roadmap entry says "spike first", which in plain
words is: run a test to find out before building anything. This plan says what the test is, what the
feature looks like, what the reasoning is also used for, and what is decided. The decisions are **D70**
and **D71**, both locked, in [maintainer-decisions-locked.md](../audit/maintainer-decisions-locked.md).
Nothing in § 6 starts until § 3 has run on the PC.

Read first: [CLAUDE.md](../../CLAUDE.md); the model and effort table in [AGENTS.md](../../AGENTS.md) § 3;
[06-thinking-blurbs-review.md](06-thinking-blurbs-review.md) for how today's thinking line came to be;
[16-soft-num-predict-thinking-budget.md](16-soft-num-predict-thinking-budget.md) for the thinking
budget; [30-kb-answer-quality-plan.md](30-kb-answer-quality-plan.md) § 4 for the spoiler-fence misfire
numbers; [41-deck-model-survey.md](41-deck-model-survey.md) for which models on the Deck can think.

**One sentence:** while a thinking model works, the space under your question shows what it is actually
thinking, three lines at a time; when the answer lands that folds to one line you can open; and the
thinking is also spent on deciding what counts as a spoiler for you.

---

## 1. What is true right now (checked 2026-09-05, nothing changed)

- **The plugin asks the model to think, pays for it, and throws the thinking away.** Since 2026-08-15 the
  Ollama tab has a *Thinking* row: Off, Brief, Balanced, Deep, default Off. Any level but Off sends the
  think flag and reserves 256, 512 or 1,024 tokens for it. The streaming reader keeps only the answer
  field of each chunk; the thinking field is never read, anywhere. Nothing of it reaches the screen, the
  saved chat, or any decision the plugin makes.
- **The Deck's default model thinks.** Ollama lists the thinking capability on the exact Gemma 4 build
  the Deck runs, checked 2026-09-05 on this PC's copy of it. So does the small Qwen model also installed
  on the Deck, where the Deep level was checked on 2026-09-04 and the answer took 212 seconds. That is the
  silence this feature fills, and it fills it for anyone who turns thinking on, not only for people who
  pulled a special model. An earlier draft of this plan said the default model could not think. It can.
- **Ollama delivers thinking as its own field, before the answer.** Its documentation says the chat
  stream carries the reasoning in one field and the answer in another, and that reasoning tokens come
  before answer tokens. The test in § 3 confirms it on the Deck's own model.
- **What the line under your question does today.** While the answer is being made, one muted 12-pixel
  line with a spinner shows a phrase the backend composes: an opener quoting your question, then rotating
  lines that escalate in tone, then whatever short status the model itself emits inside a tag. One
  writer, backend-authoritative, masked for spoilers in Strategy mode, shown only while the live turn is
  open, gone when the answer lands. The answer's own text is 12 pixels with a line height of 1.4, so one
  answer line is about 17 pixels tall and three are about 50.
- **The model already gives a spoiler-risk opinion, and it is nearly ignored.** The prompt lets the model
  close its answer with a risk tag, low, medium or high. The plugin blends that tag with its own guesses
  from the game's profile, the thing you named and the kind of cards attached, and shows the result as
  the *Spoiler risk* chip in Show details. The chip changes nothing: the service header says in as many
  words that it does not mask replies. Fences are decided by the model as it writes, under prompt rules.
- **Those fences misfire, and it is measured.** On the PC with the Deck's own model, the model wrapped
  tactics in a spoiler fence where none was due in 28 of 96 samples. A fix landed in code on 2026-09-02
  and is gated on the answer test. The tiered spoiler setting (strict, default, open) was confirmed on
  2026-09-01 and is not built yet; each tier needs prompt wording measured against that same set.
- **Show details already has a row of chips**, and a thinking chip is one more of the same kind. **A
  saved turn** holds the question, the answer and the details snapshot; nothing about thinking, and
  turn text has a size cap.
- **The vertical-space goal stands.** The transcript is 412 pixels tall. Three answer-height lines are
  about 50 of them, only while the model thinks, only when the live turn is open.

## 2. What a person gets

You ask something with thinking on. Instead of *Not forgotten, still thinking…*, the space under your
question shows the model's own latest sentences, three lines at the answer's text size, the newest at
the bottom, older ones sliding up. It never grows past three lines. When the answer starts, that space
folds to one line, *Show reasoning · 41 s*, and the answer streams in below as today. With an AI
character selected, that line is written in the character's voice instead, seconds kept, if the voice
pipeline can do it well; the plain form is the fallback. The ring can land on the folded line; A opens the whole reasoning in a muted block,
A closes it. Reopen the chat tomorrow and the folded line is still there and still opens.

Show details gains one chip: *Thinking: Balanced · 41 s · 380 tokens*, so the cost of the level you
chose is visible. The token count lives there and nowhere else.

In Strategy mode the live lines show too. The first time you turn thinking on, one notice says that the
thinking is shown unmasked and may mention things the answer will hide, and asks you to confirm.

**The second job.** With thinking on, the model is told to spend part of its thinking on you: which
spoiler tier you chose, what in the answer it is about to write would count as a spoiler under that
tier, and what it will fence. It ends its thinking with one short verdict line. The plugin reads that
line and uses it as the model's risk opinion, in place of the after-the-fact tag, so the *Spoiler risk*
chip reflects a decision the model actually made rather than a guess. The answer itself is not touched
in this first step; if the answer test shows the verdict cuts fence misfires, letting it hold back an
answer is the next step, decided then.

On a model that cannot think, or with thinking Off, nothing changes anywhere.

## 3. The test to find out, on the PC first, then the Deck

Answers the roadmap's open questions with real captured reasoning. On this PC first, with the Deck's own
Gemma 4 build, which this PC already has, to knock out obvious bugs; then on the Deck to verify. About
an hour at the desk plus model time, then one Deck block.

| # | Question | How | What decides it |
|---|---|---|---|
| T1 | Does all the thinking come first, or does it weave through the answer? | A small script talks to Ollama directly with thinking on, streams three questions, and writes every chunk with its field and a timestamp to a file. | If any thinking chunk arrives after the first answer chunk, the fold has to handle a reopening block. |
| T2 | How much thinking is there, and how fast? | Same capture: characters and seconds of thinking at Brief, Balanced and Deep, for a quick fact question, a Strategy game question with cards, and an Expert one. Deck numbers are the ones that count. | Whether three lines keep up, and what the folded line typically says. |
| T3 | Does the reasoning say spoilers out loud, and does the verdict line come out well formed? | The Red Dead ending question in Strategy mode with the corpus, with the second-job instruction in the prompt; read the captured reasoning and its last line. | How to word the one-time notice; whether the verdict is parseable often enough to use. |
| T4 | How long until the first answer token? | From the same timestamps. | How much silence the three lines are actually filling. |
| T5 | Do the newest sentences read as a status, and does the folded line work in a character's voice? | A mockup with the real captured text on the 300-pixel column, three lines at the answer's size, the plain folded line, and the folded line in three characters' voices. | The maintainer's eyes, as with the toast; "if it works" is judged here. |
| T6 | Does the verdict agree with the answer test? | Run the existing answer test on the PC with the second-job prompt: fence misfires and facts, against the baseline of 70.8 percent fence-not-misfired. | Whether the second job earns its tokens. If misfires do not drop, the verdict feeds the chip only. |

Evidence: capture files under `runs/`, the mockup linked from § 10, the answer-test report beside the
earlier ones.

## 4. The shape, as decided

1. **Live:** three lines at the answer's own text size, showing the newest sentences of the reasoning,
   replacing the composed phrase the moment the first thinking chunk arrives. Never more than three.
   The composed phrases still fill the silence before the first chunk and stay as the whole story with
   thinking Off.
2. **When the answer starts:** the space folds to *Show reasoning · 41 s*, seconds and no token count,
   and becomes a D-pad stop; A opens the full reasoning as a muted block above the answer, A closes it.
   Closed by default, always. With an AI character selected the line takes the character's voice, seconds
   kept, if it works; the plain line is the fallback.
3. **Strategy mode included.** The live lines show there too. No masking inside the reasoning; one notice
   the first time thinking is turned on, with a confirm.
4. **Saved with the chat**, capped at a few thousand characters, so a reopened chat still has the fold.
5. **Show details:** one chip with the level, the seconds and the token count.
6. **The two-star "thinking tips" entry retires.** Real thinking replaces the phrases where thinking is on;
   the phrases stay as they are with thinking Off.
7. **The second job:** with thinking on, the prompt asks the model to weigh spoilers under the chosen
   tier inside its thinking and end with a verdict line; the plugin reads the verdict as the model's risk
   opinion for the chip. The answer is not held back in this first step; that waits on the answer test.
8. **Nothing changes with thinking Off or on a model that cannot think.**

## 5. What the maintainer decided — D70, locked 2026-09-05

1. Three lines, each the height of an answer line. 2. The fold shows seconds only, and not the words
"Thought for". 3. Live reasoning in Strategy mode too; accept it; warn once. 4. Saved, capped (default).
5. A chip in Show details, yes (default; the token count lives on the chip only). 6. Retire the tips
entry. 7. Test on the PC first to catch obvious bugs, then verify on the Deck.

**D71, locked 2026-09-05:** the folded line reads *Show reasoning* with the seconds when no AI character
is selected, and takes the character's voice when one is, if it works; the verdict feeds the chip first
and the answer test decides whether it may hold an answer back; the warning is a confirm the first time
thinking is turned on.

## 6. Build steps, after § 3

One thing per commit, all four gates green between commits. Steps 1 and 4 touch backend files another
session may be in; they wait for a free window.

| Step | What lands | Who | Waits for |
|---|---|---|---|
| 1 | The streaming reader keeps the thinking field in its own buffer, publishes the newest sentences live and the whole text plus seconds and tokens at the end; the saved turn carries the capped text. Tests with a faked stream: thinking first then answer, thinking only, no thinking, a cut-off stream. | Sonnet 5 high lane | § 3 done, a free window on the backend |
| 2 | The live three-line block at answer size; the fold when the answer starts; the fold as a focus stop with open and close. Focus-graph entry first. Tests for each state. | Opus xhigh, after a device measurement of the block's height against the transcript | step 1 |
| 3 | The Show details chip, and the one-time notice with its confirm. | Sonnet 5 high lane | step 1 |
| 4 | The second job: the prompt addition under each spoiler tier, the verdict-line reader, the risk band taking the verdict in place of the tag. Chip only in this step. Measured with the answer test before it lands. | Opus xhigh plans the wording, Sonnet 5 high lane builds | T6 |
| 5 | Docs: the roadmap entry moves to Verify naming the rows below; rows in the manual test doc; a changelog line; the tips entry retired. | the session's own driver | steps 2 to 4 |
| 6 | The Deck rows in § 7. | whoever holds the Deck, Opus xhigh reads the results | step 5 and a free Deck |

Five stars, so by the routing table this plan is decisions and briefs only, Sonnet lanes build, and
Opus at extra-high effort lands it and does the one focus step itself.

## 7. Proving it on the Deck

- **REASONING-01** Thinking Balanced, the default model, a Strategy question on Deep Rock Survivor: the
  space under the question changes to the model's own sentences within a few seconds, three lines at the
  answer's size, never more.
- **REASONING-02** When the answer starts, the space folds to one line with the seconds; Down reaches it;
  A opens the block, A closes it; every stop visible, not just highlighted.
- **REASONING-03** Reopen the chat after switching tabs and after a plugin restart: the fold is there and
  opens to the same text.
- **REASONING-04** Thinking Off: today's phrases, no fold, no chip.
- **REASONING-05** Show details on a thinking turn: the chip reads the level, seconds and tokens; the
  *Spoiler risk* chip's detail says its opinion came from the model's verdict.
- **REASONING-06** Red Dead, Strategy, the ending question, first time with thinking on: the notice
  appears and asks to confirm; the live lines may name the ending; after the answer starts, nothing of the
  reasoning shows outside the closed fold; the answer's fences match the verdict.
- The free-play sweep runs, since this changes the Main tab.

Frozen chips, to confirm before pinning: *how do i kill the big armoured bug boss* (rows 01, 02, 05);
*how does the story end* (row 06, Red Dead Redemption 2); *what does the pickaxe do* (row 04).

## 8. Risks, and what to know

- **Thinking is Off by default**, so most people see none of this until they turn it on. The Thinking
  row's help text should say what they get.
- **Reasoning can spoil, and now it is shown live in Strategy mode by choice.** The one-time notice is
  the fence before the fold exists. T3 tells us how often the reasoning says the thing out loud.
- **Three lines cost about 50 pixels while the model thinks.** Measured against the transcript before the
  lane starts, as the routing rule says.
- **The second job costs thinking tokens** out of the same reserved budget. T6 says whether it pays; if
  fence misfires do not drop, the verdict feeds only the chip.
- **The fold is a new D-pad stop inside the reply**, on the Deck's hardest surface.
- **Long reasoning, saved per turn, grows the chat file.** The cap bounds it.

## 9. Out of scope

Summarising the reasoning with a second model call; masking words inside the reasoning; showing
reasoning on the toast; changing the thinking levels or budgets; building the tiered spoiler setting
itself, which has its own entry and needs its prompt wording measured first; choosing new models, which
is [plan 41](41-deck-model-survey.md).

## 10. Progress log

Written as work lands.

- **2026-09-05** — Plan written. D70 raised. Roadmap: the entry points here; the thinking-tips entry
  notes the question. Nothing captured, nothing built.
- **2026-09-05, later** — D70 locked from the maintainer's answers; plan reworked: three lines at answer
  size, seconds-only fold with new wording pending, live in Strategy with one notice, tips entry retired,
  PC first then Deck. Corrected: the Deck's default Gemma 4 build can think. Added the second job, the
  spoiler verdict, with D71 raised for its reach and the fold's wording. Nothing captured, nothing built.
- **2026-09-05, later still** — D71 locked: *Show reasoning* plain, the character's voice when one is
  selected if it works; verdict to the chip first; a confirm once. Nothing captured, nothing built.
- **2026-09-15 and 16** — Dropped from feature session four by the maintainer (D105) and drawn at
  true size on the [mockup page](https://claude.ai/artifact/2De58qirE34754PEZVPmdb) instead. The
  maintainer's call (D106): the first version builds with the plain fold; the voiced fold is its own
  optional entry; the second job waits. **The build plan is
  [plan 57](57-reasoning-display-build.md)**; § 6 here is superseded by it. Nothing built.
- **2026-09-17** — Built and landed. See plan 57 § 10 for the desk test, the answer test, the device
  measurement, the landings and what is still owed on the Deck.
