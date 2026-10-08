# Plan 83 — Haiku 5.5 trial: can the cheapest model take over some of the work?

Written 2026-10-08 with the maintainer; the maintainer picked the jobs and said to write it and push it. Nothing
has run yet. Earlier trials: [plan 75](75-sonnet-5-5-trial.md) (Sonnet 5.5) and [plan 33](33-model-routing.md)
§ 4a and § 4b.

**One sentence:** four helper settings (Sonnet medium, Sonnet high, Haiku medium, Haiku high) do the same six
real jobs from the same start, Opus scores them without knowing which is which, and the best version of each
job lands on `experimental`.

## Why (plain language)

- **Two things to save: hitting the usage limit part way through a session, and money.** The maintainer wants both.
- **Haiku has never really been tried here.** The old Haiku trial (plan 33 § 4a) still has an empty log. The
  notes against it ("would do worse on the roadmap", "not for code") are guesses, not results.
- **What this trial answers:**
  1. Can Haiku replace Sonnet as the bookkeeper?
  2. Can Haiku do one- to three-star bugs and features?
  3. Where it falls short, does it fall short safely (says it is unsure), or does it claim work that is not
     done?

## What the trial does not cover

- **Anything on the Deck.** This session is in the cloud and cannot reach the Deck. Opus judges by reading the
  code and running the tests. The Deck checks for what lands are owed and listed in § 7.
- **Screen and focus work.** The AI models box Filters feature was dropped for this reason (the maintainer's
  call): no model gets screen work right without a measurement on the Deck first.
- **The heavy reading jobs** (summaries, checks of a plan's claims, first-pass review). These are listed in
  § 10 as the next trial, once this one shows whether Haiku can be trusted with real edits.

## 1. The four settings

| Label in the session's notes | Model | Effort |
|---|---|---|
| S-M | Sonnet 5.5 | medium |
| S-H | Sonnet 5.5 | high |
| H-M | Haiku 5.5 | medium |
| H-H | Haiku 5.5 | high |

Each run uses the real helper for the job (the bug, feature or bookkeeping helper) with only the model and
effort changed at start. No trial copies of the helper files are needed. **Check first:** that Haiku 5.5 accepts
both effort levels. If it does not, run it at the one it accepts, and say so in the results.

Opus 5.5 at extra-high plans, writes the briefs, judges, and lands. That is the same split as today.

## 2. The six jobs

| # | Job | Stars | Kind | Why it is a good test |
|---|---|---|---|---|
| J1 | Remove the leftover row number from the settings card | ★ | Bug, mechanical | One obvious way, about six files. Tests whether Haiku is careful over many small edits |
| J2 | A reply that arrives while the panel is shut may not be autosaved (developer builds) | ★ | Bug, needs judgment | The cause is suspected, not proven, and it is about timing. Tests where Haiku stops coping |
| J3 | A day line in the "N earlier" list opens a few questions at a time | ★★ | Feature | Clear behaviour, easy to test, one new control on the D-pad path |
| J4 | Terse mode: Speed answers in three lines (the back-end half and the setting) | ★★★ | Feature | A real spec, settings plumbing in about 18 places, prompt rules with exceptions |
| J5 | Trim the roadmap | — | Bookkeeping | The hardest bookkeeping: strict layout rules, nothing may be lost. Sonnet tripped on this kind of job once |
| J6 | The paperwork after J1 to J4 land | — | Bookkeeping | The everyday bookkeeper job: roadmap rows, testing rows, changelog lines, each status naming its evidence |

### Briefs, in short (the full briefs are written by Opus at the start of the run)

**J1.** The settings card used to have a fake keyboard marker. It is gone, but the row number it used
(`selectedIndex` and `setSelectedIndex`) is still stored and passed through `MainTabUnifiedAskBar.tsx`, its
types file, `useSteamSettingsSearch.ts`, `useAskBarSettingsCardRows.ts`, `useAskBarSettingsCardVisibility.ts`
and the snapshot actions hook. Today it only paints the row you last clicked. Remove it. Keep the D-pad
behaviour of the card exactly as it is. If the "last clicked" paint is worth keeping, say so in the report;
do not keep the state for it.

**J2.** Finding 6 of the plan 78 read-through (`docs/test-evidence/plan78-G-after-answer-readthrough.md`). In
`useBonsaiAskOrchestration.ts`, the desktop autosave settings copy starts from the first render and is only
refreshed after settings load. When a finished answer is painted on reopen before that, the autosave is
skipped, and the answer is then marked handled, so it is never retried. Confirm or rule out the cause with a
test first, then fix it. The test must fail without the fix.

**J3.** Today, A on a day line shows every question of that day. Wanted: show the first **six**, then a
"Show N more" line at the end of that day's group that adds the next six. Pressing B, or collapsing "N earlier",
resets it. Code lives in `earlierTurnsByDay.ts`, `buildEarlierList.tsx`, `EarlierListLine.tsx`,
`MainTabChatTranscript.tsx` and the transcript nav helpers. The new line follows the focus rules in AGENTS.md
("Adding a new control"). Tests for 0, 1, 6, 7, 13 and 100 questions in a day, and for the D-pad walk over the
new line.

**J4.** Build what [roadmap-details § Terse mode](../roadmap-details.md#terse-mode-speed-answers-in-three-lines)
settles, minus the stacked-buttons look:

- the setting, off by default, with its help line;
- the three-line rule in Speed mode;
- the overrides against the reply-style slider and the character;
- the two escape hatches (destructive warnings, the ten depth phrases);
- the branch picker allowed on every terse reply and on follow-ups.

The stacked full-width buttons are screen work and stay for Opus after a Deck measurement. The answer test
over ten real questions needs Ollama and is owed (§ 7).

**J5.** The roadmap is about 89 KB. The size check's best is 62.6 KB and its ceiling is 100 KB. Bring it under
63 KB by moving long entry bodies to `roadmap-details.md` and finished entries to the archive. Leave each
entry's one-line summary and status in place, with a link to where the rest went. **Nothing is removed.**
Every sentence that moves must be findable in its new home. All checks green, including the docs split check
and the table-of-contents check.

**J6.** After J1 to J4 land: the roadmap rows move (bugs to Verify, features to Verify or Partial), a testing
row is added for each, and a changelog line for each. Every status names its evidence. None of these can say
"passed on the Deck", because nothing ran there. All four J6 runs start from the same commit, the tip after
J5 and the J1 to J4 landings.

## 3. Fair-run rules

- **Same brief word for word, and the same starting commit, for all four runs of a job.** The starting commit
  for J1 to J5 is the commit *before* this plan, so no helper can read that it is being compared or what the
  plan expects.
- **Each run works in its own copy of the repo** and keeps scratch files in a folder of its own. Plan 75 lost a
  run when two helpers picked the same script name.
- **Packages are installed once** in the main checkout. Each copy links to them. The brief says: "run the
  baseline checks now, without an install". Plan 75 found that "go straight to the checks" was misread as
  "skip the checks".
- **The four runs of a job start together.** At most ten helpers at once, so the jobs run in batches:
  - batch 1: J1 and J2 (8 runs);
  - batch 2: J3 and J4 (8 runs);
  - batch 3: J5 (4 runs);
  - batch 4: J6 (4 runs), after J1 to J5 land.
- **Helpers are not told they are compared.** The judge sees labels A to D, shuffled per job. It does not read
  commit messages or helper logs until after scoring.
- **Usage is read from each helper's own log:** tokens in, out and re-read, steps, tool calls, minutes. It is
  priced at list rates looked up on the day the trial runs (Haiku 5.5's price is not in plan 33 yet).

## 4. How the judging works

Opus 5.5 at extra-high judges each job's four versions blind, out of 25:

| Mark (of 5) | What it asks |
|---|---|
| Right | Does it do what the brief asked, in every case the brief names? |
| Holds up | Edge cases, timing, nothing broken nearby |
| Proof | Tests that fail without the change; checks actually run, not claimed |
| Fits the repo | AGENTS.md rules, the focus rules, the plain-language rule in anything the maintainer reads |
| Honest | The report matches the work. Nothing claimed that did not happen |

For each version the judge also lists "must fix" (wrong, or misses the goal) and "should fix".

**A claim of work not done is an automatic fail for that run,** whatever its score. For bookkeeping, that
means a status changed without naming its evidence, a sentence lost in a move, or a test row marked passed.

## 5. The rule for each decision

Plan 33's rule: a cheaper setting wins if its quality is no worse, and a dearer one must show fewer problems to
earn its cost. For Haiku, made concrete:

- **Haiku replaces Sonnet medium as the bookkeeper** if, on both J5 and J6, a Haiku run scores within two points
  of the best Sonnet run, has no must-fix and no automatic fail.
- **Haiku takes mechanical one-star fixes** if it does so on J1.
- **Haiku takes judgment fixes or features** only if it does so on J2, J3 or J4. The record and plan 75 both
  suggest it will not, and that is fine to find out.
- **Each decision rests on one run per setting per job.** Say so plainly in the results. A "yes" is a
  suggestion to try in the next real session, with the misses logged. It is not a permanent rule.

## 6. Landing

- The winner of each job lands on `experimental`, one commit per job, every check green on the merged tree.
  The judge may borrow a piece from a losing version, and says which.
- If no version of a job is landable without fixes, Opus finishes the best one, or the job does not land, and
  the maintainer is told why.
- The order is J1, J2, J3, J4, then J5. J6 runs after all of them and lands last.
- Copies of the repo and their branches are removed once the results are written.

## 7. Owed after the trial (not this session)

- **Deck checks:** J1 (the settings card behaves as before), J3 (the new line on the Deck's own screen, the
  D-pad walk over it), J4 (the toggle on the Ollama tab and its help line).
- **J4's answer test:** ten Speed questions with Terse on, at least eight within three lines, run against real
  Ollama.
- **J4's stacked buttons:** Opus, after a Deck measurement.

## 8. Results

*Filled in when the trial runs.* For each job: a table of setting, score, must fix, should fix, cost, minutes,
steps. Then totals per setting. Then the suggested routing next to today's, with the reason for each line.
Plain language first, numbers second.

## 9. The maintainer's calls

1. **2026-10-08: the jobs.** The AI models box Filters feature is dropped (screen work, cannot be judged
   without the Deck). The two bugs are J1 and J2. The bookkeeping jobs are the roadmap trim and the
   after-landing paperwork. The winning version of each job lands on `experimental`.
2. *Open:* the routing change, once § 8 is filled in.

## 10. Next, if Haiku earns a place: the heavy reading jobs

These cost the most and have answers that can be checked. They are candidates for a second, smaller trial:

- **First-pass review of a helper's work.** What changed, did the checks pass, what does the log say. Opus
  still judges. In one bug session, the work of the one running the session cost more than all six helpers
  together ($290 against $237).
- **Checking every claim in a plan against the code.** Ten checkers on the most expensive model cost $62 once.
- **Mapping the code before a big change:** who uses what, and which files are involved. Three Opus helpers
  cost about $50 for this once.
- **Summarising Deck evidence files and logs** into a few lines.
- **Cutting down re-reading.** One Sonnet helper re-read about seven million tokens over 67 steps for one
  two-star bug. A short Haiku summary of the files, handed over at the start, might cut that. A test to find
  out, not a promise.
