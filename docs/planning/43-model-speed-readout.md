# 43 — How fast is this model on this Deck: the one-shot readout

Written 2026-09-06, before any code. The fifth of the six features the maintainer asked to have planned one
at a time. The roadmap's five-star **On-Deck model benchmark** wanted to rank installed models by measured
speed and offer the ranking as the try order. Its own go/no-go gate said: if run-to-run timings are not
stable enough to rank on, descope to a one-shot "how fast is this model here?" readout and nothing more.
Nobody has run that gate, and the ranking is not what a person is missing today. This plan takes the
descope now, on purpose, and keeps the ranking parked behind data the readout will collect for free.
The decisions are **D75** in [maintainer-decisions-locked.md](../audit/maintainer-decisions-locked.md).

Read first: [CLAUDE.md](../../CLAUDE.md); the model and effort table in [AGENTS.md](../../AGENTS.md) § 3;
[13-roadmap-feature-ideas.md](../archive/13-roadmap-feature-ideas.md) § C1, where the benchmark and its gate were
drawn; [41-deck-model-survey.md](41-deck-model-survey.md) § 8, whose Deck half wants exactly the numbers
this readout produces.

**One sentence:** next to each installed model, a person sees how fast it answered on this Deck the last
time it was used, and can press one button to time it now; nothing is reordered for them.

**Why this and not the ranking:** the plugin already produces every number the ranking would need, on
every answer, and throws them into the log. Showing them costs a little; ranking on them costs a study of
whether they hold still, and the Deck has no idle state to study from. Show first. The ranking's study
then runs itself, because the readout keeps a record.

---

## 1. What is true right now (checked 2026-09-06)

- **Every answer already carries its timing and its model.** The answer's diagnostics, shown today in
  the Developer details chip under Show details, hold the seconds the answer took and which model
  actually answered after routing. The stream's end also reports how many pieces the model wrote and how
  many it read; the plugin logs both and keeps neither.
- **Ollama reports more than the plugin keeps.** The end of every streamed answer also carries how long
  the model took to load, how long it spent reading the question, and how long it spent writing. The
  plugin reads only the counts. The durations are one more field each on the same line of code.
- **Words a second is a division of two of those numbers.** Pieces written over seconds spent writing,
  scaled to words (about three words for every four pieces). Time to the first word is the load time
  plus the reading time. Nothing needs a stopwatch the plugin does not already have.
- **The plugin knows what game is running.** The running title is already part of every Ask's context.
  So a timing can say "measured with Deep Rock Survivor running", which is the difference between a
  number a person can trust and one they cannot.
- **A boot-time warm-up exists** behind a developer switch: it loads the small model Ask would reach,
  with a zero-length request, the documented way to load a model without asking it anything. That is the
  load-time measurement, already written, minus the stopwatch.
- **The model picker shows per-model badges** today: tier blocked, high VRAM off, vision unverified. A
  speed badge is a fourth of the same kind, in the same row.
- **The bake-off's Deck half is waiting on these numbers.** Its run sheet asks, per model: did it load
  beside the game, seconds to load, seconds to the first word, words a second, thinking seconds. Today
  the plan is to get them by hand from run files. With this readout they come from a button.
- **Nothing reorders models on its own**, and that rule stays. The try order is the person's.

## 2. What a person gets

Two halves; the first is nearly free, the second is the button.

**The record, kept on every answer.** After each answer the plugin remembers, per model: the date,
words a second, seconds to the first word, seconds to load if the model was cold, the mode, whether
thinking was on, and what game was running. The last ten per model, on this Deck only, cleared with
everything else by Clear all plugin data. Nothing leaves the device.

Where it shows:

- **In the model picker**, one small badge per installed model: *9 words/s* for a model that has
  answered on this Deck, *not timed yet* for one that has not. The badge is the most recent answer, not
  an average; the date and the game are in the readout below, not in the badge.
- **Under Show details**, one plain line for the answer just given: *Answered in 12 s with Gemma 4 E2B:
  loaded in 4 s, first word after 5 s, 9 words a second, Deep Rock Survivor running.*
- **In the Ollama tab**, under the installed models, a short readout per model: the last few timings
  with their dates, modes and games, so a person can see that Expert with thinking on is slower than
  Speed without, rather than wonder why the badge moved.

**The button, one press.** Next to each installed model, **Time this model now**. It asks the model one
fixed, short, spoiler-free question with thinking off and a small answer cap, and reports the same
line: loaded in, first word after, words a second, and whether it loaded beside whatever is running. It
runs in the background with a cancel, because a cold model can take a minute to load, and the picker
says *Timing…* until it is done. The result goes into the same record, marked as a timing run rather
than an answer. No typing on the on-screen keyboard: the question is the plugin's, the same every time.

**What it never does.** Rank. Reorder. Suggest a reorder. Time models on a LAN host (the record works
there too, but the button is for this Deck). Judge which model answers better; that is the bake-off's
answer test, on the PC.

## 3. Why the numbers cannot be a ranking, and what the record does about it

A timing on the Deck depends on what else the Deck is doing: a game holding the chip, battery against
the dock, heat. The same model can be twice as fast at the desk as in a fight. The five-star plan's gate
asked for a study of how much the timings wander before ranking on them. This plan does not run that
study; it makes it unnecessary to schedule. Every record entry says what game was running and which
mode was used, so after a few weeks of ordinary use the record *is* the study: filter by "no game, Speed,
thinking off" and see whether the numbers hold still. If they do, the ranking becomes a small feature on
top of this one. If they do not, the roadmap learns that for free.

The badge, meanwhile, is honest about being one number: it names itself as the last answer, and the
readout under it shows the spread.

## 4. The rules

- **A timing is recorded from a real answer only when it is clean:** the answer completed (not stopped,
  not failed), and the stream reported its counts. A retry after a failure records the retry.
- **The load time is recorded only when the model was cold.** Ollama reports a near-zero load for a
  warm model; that is stored as *warm*, not as *loaded in 0 s*.
- **Words a second means the writing phase only**, not the whole wait; thinking seconds are kept
  separately when thinking was on, matching the bake-off's fields.
- **The badge shows the most recent entry**, whatever its mode; the readout shows the last ten with
  their conditions. No averages in Phase 1; an average of a game-running number and a desk number is a
  number of nothing.
- **The button's question** is fixed text inside the plugin, general and spoiler-free (the plan
  proposes: *Give me five short tips for playing any game on a handheld*), thinking off, answer capped at
  about a hundred and twenty words, no knowledge base, no character. Same question every time so the
  numbers compare across dates.
- **The button refuses politely** when an Ask is already running, when the host is a LAN machine (it
  says the record still fills from answers), and when the model is tier-blocked.
- **The record is the bake-off's run sheet.** Its fields match the sheet one for one, so the Deck half of
  the bake-off is: press the button for each candidate, with the game running, and copy the lines.

## 5. What the maintainer decides — D75, open

1. **Both halves, or the record alone?** (a) the record and its badge and lines only, no button; (b) the
   record plus the button. *Recommendation: (b).* The button is what turns the bake-off's Deck half from
   an afternoon of scripts into ten presses, and it is the only way to time a model that has never been
   picked.
2. **Where the numbers show.** (a) picker badge, Show details line, and the Ollama tab readout; (b) Show
   details and the Ollama tab only, keeping the picker as it is; (c) Developer tab only. *Recommendation:
   (a).* The picker is where a person chooses a model, and one badge is the whole point.
3. **Timing with a game running.** (a) run and record, with the game's name on the entry; (b) warn first
   that the number will be lower with a game running, then run; (c) refuse until the game is closed.
   *Recommendation: (a).* A number with the game named is a true number; the game-running case is the
   one people live in.
4. **Write each timing to the Desktop notes file as well**, one line, so the bake-off sheet can be filled
   from a text file rather than the screen? (a) yes, when Desktop notes are on; (b) no, screen only.
   *Recommendation: (a).* It reuses the existing notes writer and costs a line.
5. **What happens to the five-star entry.** (a) retire it from the roadmap; its ranking half lives in the
   details file behind the record's data; (b) keep it at five stars beneath this one. *Recommendation:
   (a).* Keeping a five-star line for a feature that its own gate said to descope is noise.
6. **Stars.** Record alone is two; with the button, three. *Recommendation:* file this plan at three.

## 6. Build steps, when this is picked up

Only after D75 is answered.

| # | Step | Who | Depends on |
|---|---|---|---|
| 1 | Keep the durations. At the end of a streamed answer, read the load, reading and writing durations beside the counts the plugin already reads, and pass them out with the answer's diagnostics. Test: a fake stream end with all six fields lands them in the diagnostics; a stream without them leaves the fields absent, not zero. | Sonnet 5 high lane | nothing |
| 2 | The record. A small store in the settings folder, per model, last ten entries, with the fields in § 4 and the game's name; written on every clean answer; cleared by Clear all plugin data (add it to that RPC's list, which round 36 just fixed to clear everything). One RPC reads it. Tests: clean answer records; stopped answer does not; the eleventh entry drops the first; the clear wipes it. | Sonnet 5 high lane | 1 |
| 3 | The lines. The Show details line built from the answer's diagnostics; the picker badge from the record; the Ollama tab readout from the record. Plain words, no shorthand: *9 words a second*, not *9 tok/s*. Tests for the text builder: cold and warm load, thinking on and off, no game, a model never timed. | Sonnet 5 high lane | 2 |
| 4 | The button. A background job like the voice-engine install: start returns at once, status is polled, cancel works. It runs the fixed question through the ordinary answer path with a forced model, thinking off and the small cap, then records the entry marked as a timing run. Refusals per § 4. Focus-graph entry for the button in the picker row. Tests with a fake Ollama: a cold model reports a load time; cancel mid-load leaves no entry; a LAN host is refused with the right words. | Sonnet 5 high lane; Opus xhigh reviews the focus entry | 2, 3 |
| 5 | Desktop notes line, if D75 says yes. | Sonnet 5 high lane | 4 |
| 6 | Docs: roadmap, testing rows, changelog; the bake-off's § 8 rows updated to say "press the button". | Sonnet 5 high | 5 |

RPC names, for the generated map's sake, carry *model* and *speed* so they file beside the model RPCs;
the map classifies by substring and does not warn.

## 7. Proving it on the Deck

Rows go in the manual test doc when step 6 lands. No typed questions: every row is a button or an
ordinary Ask.

- **SPEED-READOUT-01** A fresh install, no answer yet: every picker badge reads *not timed yet*; the
  Ollama tab readout says the same per model.
- **SPEED-READOUT-02** One Speed answer with the default model, no game: Show details carries the line
  with load, first word, words a second and *no game running*; the picker badge shows the words a
  second; the Ollama tab readout shows one entry with today's date.
- **SPEED-READOUT-03** The same with Deep Rock Survivor running and Expert with thinking on: the line
  names the game, shows thinking seconds, and the badge updates to the slower number.
- **SPEED-READOUT-04** Press *Time this model now* on a model that has never been picked, game running:
  the picker says *Timing…*, cancel works during the load, a second press completes and the entry is
  marked as a timing run; the load time is a cold load.
- **SPEED-READOUT-05** Clear all plugin data: every badge is back to *not timed yet*.
- **SPEED-READOUT-06** Ask routed to a LAN host: answers still record; the button refuses with the
  words in § 4.
- **BAKEOFF-02 rerun**, from plan 41: the Deck half of the bake-off done with the button, one press per
  candidate, game running, lines copied into the run sheet.

## 8. Out of scope

- Ranking, reordering, or suggesting an order. The record makes that a later, smaller feature.
- Averages or trends. Phase 1 shows entries with their conditions.
- Timing a LAN host with the button.
- Any quality judgement. The bake-off's answer test owns that.
- Temperature, battery or dock state on the entry. Worth adding if the record shows the numbers wander
  for reasons the game's name does not explain.

## 9. Progress log

- **2026-09-06** — Plan written. The five-star benchmark descoped on purpose to a readout: the numbers
  already exist per answer, the durations are one more field each, and the record answers the gate's
  question over time. Six calls raised as D75. Deck rows written; the bake-off's Deck half becomes a
  button press.
