# Plan 75 — Sonnet 5.5 trial: which model and effort should the helpers use?

Written and run 2026-09-28, the day Sonnet 5.5 came out; the maintainer asked for it and said "go" on every
pick. The plan was kept outside the repo until the results were in, so no Deck helper could read which checks
were expected to fail. Earlier trials: [plan 33](33-model-routing.md) § 4b.

**One sentence:** five settings did the same five jobs from the same start, a reviewer who did not know which
was which scored them, and the cheapest setting whose work was no worse is the suggestion for that kind of job.

## Results in short (plain language)

- **No setting was best at everything.** Each job type has a different winner, and the gaps are often one or
  two points out of 25. Every verdict rests on **one run per setting per job**: five runs a job, 25 in all.
- **Sonnet 5.5 is far cheaper than Sonnet 5 was.** The old worry, hundreds of short steps re-reading the same
  context, did not happen: Sonnet runs took about as many steps as Opus runs, and re-reading costs the same on
  both ($0.20 per million).
- **The job that needed real judgment split them sharply.** On the speech server bug only Opus medium (22) and
  Sonnet high (21) kept the promise in every timing case; Sonnet medium (14) and Sonnet low (12) left the mic
  ignoring the server's answer, which is the original bug with the callers swapped.
- **Nobody made anything up.** Across bookkeeping and Deck testing, no run claimed a result the evidence does
  not back, and no Deck run ever passed a check that should have failed.
- **Overall, Sonnet high scored best (82 of 100 over the four reviewed jobs) and Opus medium next (81), at $10.98
  and $12.95 for all five jobs.** Sonnet medium was cheapest ($7.61) but failed the judgment job.
- **One rule break:** Sonnet low ran another helper's script inside that helper's copy (bookkeeping). And a line
  of the session's own brief was misread by several helpers; see § 8.

## 1. The five settings

Sonnet 5.5 low, medium and high; Opus 5.5 low and medium. Each had a helper file per job that is a copy of the
real helper with only the model and effort lines changed (checked with a diff). The trial files were untracked
and are removed when the maintainer has decided (§ 9).

## 2. The five jobs

| # | Job | What | Right answer from |
|---|---|---|---|
| J1 | Simple fix (★) | The text try-order picker lists the note-search model as a choice | Blind review; the Deck for the landed fix |
| J2 | Fix that needs judgment (★★) | Two things wanting the speech server at once: a second caller with another model restarts it under the first | Blind review; tests (nothing uses it that way today) |
| J3 | Feature (★★) | The answer's first lines in the "Reply ready" popup (plan 38), after the popup was measured on both screens the same day | Blind review |
| J4 | Bookkeeping | Replay of the real plan 74 docs sweep: the real brief, from the real start `6e15e562`, evidence files in place | Blind review against what landed that day (`18bfd558`) |
| J5 | Deck testing | The same six checks on the real Deck, one helper after another | Four checks passed on 2026-09-28 (plan 74); two fail today |

## 3. Fair-run rules, as run

- Same brief word for word and same start for all five runs of a job; each code or bookkeeping run in its own
  copy of the repo, named `t75-<job>-<n>` with the numbers shuffled.
- All five runs of a job started together, so they shared the PC equally (other jobs ran alongside, so minutes
  are only comparable within a job). Deck runs went one at a time, in a shuffled order that came out as Sonnet
  low, medium, high, Opus low, medium; one build for all five.
- The helpers were not told they were compared. The reviewers (Opus 5.5 at the session's high effort) saw
  labels A to E with model names masked, and were told not to read commit messages.
- Replay honesty: no bookkeeping run looked at the answer commit or later history (their logs were searched).
- Usage priced from each helper's own log at list: Opus 5.5 $4 in, $20 out; Sonnet 5.5 $2 in, $10 out; cache
  reads $0.20 on both; cache writes 1.25 times input.

## 4. Results by job

Score out of 25 (right, holds up, proof, fits the repo, honest; five marks of five). "Must fix" = wrong or fails
the goal.

**J1, simple fix (picker).**

| Setting | Score | Must fix | Should fix | $ | Minutes | Replies |
|---|---|---|---|---|---|---|
| Sonnet medium | **22, the pick** | 0 | 1 | 0.62 | 13.1 | 17 |
| Sonnet high | 22 | 0 | 2 | 0.86 | 17.5 | 25 |
| Opus medium | 21 | 0 | 2 | 1.56 | 16.6 | 34 |
| Sonnet low | 19 | 0 | 3 | 0.66 | 15.5 | 17 |
| Opus low | 19 | 0 | 3 | 0.65 | 12.9 | 16 |

All five fixed the picker. The pick also made answers skip the model on the back end; one piece (a pulled
note-search model no longer joins a saved order) was borrowed from Opus medium's attempt before landing.

**J2, fix that needs judgment (speech server).**

| Setting | Score | Must fix | Should fix | $ | Minutes | Replies |
|---|---|---|---|---|---|---|
| Opus medium | **22, the pick** | 0 | 2 | 1.09 | 11.4 | 23 |
| Sonnet high | 21 | 0 | 1 | 0.56 | 12.9 | 14 |
| Opus low | 16 | 1 | 2 | 0.49 | 11.0 | 10 |
| Sonnet medium | 14 | 2 | 2 | 0.61 | 12.4 | 21 |
| Sonnet low | 12 | 2 | 4 | 0.51 | 11.5 | 15 |

All five chose the same behaviour (first holder keeps the server; a newcomer with another model is refused).
They differed in whether the code keeps that promise while the model is still loading, and whether the mic obeys
the answer. Before landing, the pick took a corrected note from Sonnet high's attempt, and the session tightened
its refusal to look at the holders' model rather than whether the server is answering (a new test proves it).

**J3, feature (popup).**

| Setting | Score | Must fix | Should fix | $ | Minutes | Replies |
|---|---|---|---|---|---|---|
| Sonnet medium | **18, the pick (after a fix)** | 1 | 0 | 0.66 | 18.3 | 22 |
| Sonnet low | 18 | 0 | 2 | 1.05 | 19.6 | 24 |
| Opus medium | 16 | 1 | 1 | 1.65 | 20.4 | 27 |
| Sonnet high | 16 | 1 | 0 | 1.19 | 30.7 | 29 |
| Opus low | 13 | 1 | 3 | 0.88 | 19.6 | 16 |

The hardest job; nothing is landable without fixes. Two let a spoiler written with `~~~` through; two fill the
title so full that Steam would often cut its last word; two count letters, which wide text can overflow. All five
share one rare leak: a fence closer glued to the end of a sentence. Not landed: 0.6.0 is days away and the
maintainer decides (§ 9).

**J4, bookkeeping (replay of the plan 74 sweep, 32 items).**

| Setting | Score | Must fix | Should fix | $ | Minutes | Replies |
|---|---|---|---|---|---|---|
| Sonnet high | **23, the pick** | 0 | 1 | 3.44 | 14.1 | 66 |
| Opus medium | 22 | 0 | 1 | 2.97 | 13.5 | 46 |
| Opus low | 21 | 0 | 1 | 2.95 | 11.7 | 54 |
| Sonnet medium | 20 | 0 | 2 | 2.03 | 14.7 | 42 |
| Sonnet low | 16 | 1 | 2 | 2.33 | 14.0 | 50 |

The reviewer checked more than 20 claims per attempt against the evidence files: none unsupported. Three
attempts beat the version that actually landed in places (it swapped two commits and left a note open). For
comparison, the real run on 2026-09-28 (Opus low, in the shared checkout) cost $2.07 in 5.8 minutes. Sonnet
medium's score is partly the cost of a redo: Sonnet low ran Sonnet medium's scratch script inside its copy.

**J5, Deck testing (six checks; four should pass, two should fail).**

| Setting | Right verdicts | False passes | $ | Minutes | Presses and reads |
|---|---|---|---|---|---|
| Sonnet low | 6 of 6 | 0 | 3.66 | 12.4 | 150 |
| Sonnet medium | 6 of 6 | 0 | 3.69 | 12.3 | 172 |
| Sonnet high | 6 of 6 | 0 | 4.93 | 14.5 | 267 |
| Opus low | 5 of 6, one UNCLEAR | 0 | 3.67 | 12.9 | 90 |
| Opus medium | 5 of 6, one COULD NOT RUN | 0 | 5.68 | 13.1 | 141 |

The one split is the Tier 2 check. Its setup (policy "open source only") hides the open-weight models the check
needs to queue, read literally. The three Sonnet runs found a route (queue first, then switch the policy); both
Opus runs stopped and said the setup could not be met, which their rules tell them to do. The runbook was the
session's mistake, not theirs. Every run also restored every setting it changed.

**Totals per setting (the five jobs; reviews and the session itself not included).**

| Setting | $ | Minutes | Score, four reviewed jobs (of 100) | Must fix | Deck verdicts right |
|---|---|---|---|---|---|
| Sonnet low | 8.21 | 73 | 65 | 3 | 6 of 6 |
| Sonnet medium | 7.61 | 71 | 74 | 3 | 6 of 6 |
| Sonnet high | 10.98 | 90 | **82** | 1 | 6 of 6 |
| Opus low | 8.64 | 68 | 69 | 2 | 5 of 6 |
| Opus medium | 12.95 | 75 | 81 | 1 | 5 of 6 |

Trial overheads: four blind reviews $17.0; the popup measurement $6.25; the landing check on the Deck $3.32.
The five jobs themselves: $48.39.

## 5. Suggested routing (for the maintainer; nothing changed yet)

The verdict rule is plan 33's: a cheaper setting wins if its quality is no worse; a dearer one must show fewer
problems to earn its cost. One run per cell, so each line is a suggestion to try, not a proof.

| Work | Today | Suggested | Why |
|---|---|---|---|
| Fixes with a known cause and one obvious way | Opus low | **Sonnet medium** | 22 against 19 at the same cost |
| Fixes that need a judgment (timing, state, "decide how") | Opus medium | **Opus medium, or Sonnet high to save half** | 22 and 21; Sonnet medium and low failed the goal |
| Features | Opus medium | **No change** | No setting did well; the session's review found must-fix problems in four of five |
| Bookkeeping | Opus low | **Opus medium** (Sonnet high if quality matters more than 15% cost) | 22 at the same cost as Opus low here; ranked first in plan 33's trial too |
| Running written Deck checks | Opus medium | **Sonnet medium** | Every verdict right, 35% cheaper, and it got through the ambiguous check |

Not suggested: Sonnet low for anything that edits files outside a strict one-copy setup (it broke that rule).

## 6. The Deck check list (J5), with the expected answers

| Check | Expected | Why |
|---|---|---|
| Q1-UPDATE-BOX-RING | Pass | Passed 2026-09-28, plan 74 |
| Q2-SAFE-FIRST-TIER2 | Pass | Passed 2026-09-28, plan 74 |
| Q3-CLEAR-CACHE-ROW | Pass | Passed 2026-09-28, plan 74 |
| Q4-ASK-UP | Pass | Passed 2026-09-28, plan 74 |
| Q5-TRYORDER-ANSWER-MODELS | Fail | The picker bug (J1), open on the deployed build |
| Q6-REMOVE-KB-SAFE-FIRST | Fail | Open bug: "Remove knowledge base?" opens on Remove |

Evidence: `docs/test-evidence/t75-<n>-<CHECK>.json`, n = 1 to 5 in the run order above.

## 7. Landing

- **J1** landed as `a877a321` (the pick plus the borrowed pull guard, `2cd68796`).
- **J2** landed as `8ec3426a` (the pick plus the tightened refusal and the borrowed note, `54643d2f`).
- **Deck check of both on the deployed tip `8ec3426a`, 2026-09-28 18:15 to 18:23, the Deck's own screen: all
  three passed first time** (the standard Deck helper, Opus medium, $3.32, 8.9 minutes).
  - The picker lists only gemma4, before and after Reset; the saved order is untouched
    (`t75-land-L1-PICKER-ANSWER-MODELS.json`).
  - An old order with the note-search model first shows only gemma4, and Done saves `["gemma4:e2b-it-qat"]`
    (`t75-land-L2-OLD-ORDER-CLEANED.json`).
  - The mic starts the speech server while recording and stops it within half a second, with no error
    (`t75-land-L3-MIC-STARTS-AND-STOPS.json`).

## 8. Lessons

- **A runbook step that cannot be met as written splits careful helpers from resourceful ones.** Write the route
  into the step (here: queue the model before switching the policy).
- **Helpers in parallel copies share the system temp folder.** Two picked the same script name. Tell each helper
  to keep scratch files in a folder of its own.
- **"Go straight to the gates" was read as "skip the baseline".** Several helpers skipped the before-you-start
  gates after the override "do not run pnpm install. Go straight to the baseline gates." Say "run the baseline
  gates now, without an install".
- **The popup's title font is bold and its measuring string had no lowercase.** Every feature attempt guessed
  bold lowercase widths. The Deck check of the feature needs an ordinary, an all-capitals and an m/w-heavy line.

## 9. For the maintainer

1. The routing suggestions in § 5: adopt, adopt some, or run one more wave first.
2. The popup feature: land the pick with its fixes before 0.6.0, or after.
3. The trial helper files (15) and the 25 repo copies are removed once you have decided.

## 10. A pricing slip found while setting up

Plan 33 § 4b's third trial (the plan 74 wave) priced Opus 5.5 cache reads at $0.40 per million; the list price is
$0.20, which the first two trials used. Re-priced from the same token counts, every lane of that wave was cheaper:
the D-pad lane's round 2 was $1.72, not $2.25, and round 1 $15.63, not $26.02; the Opus medium lanes $0.82 to
$1.25 per commit, not $1.33 to $1.64. The conclusions there do not change. Corrected in plan 33.
