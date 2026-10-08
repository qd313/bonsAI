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

- **Deck checks: done 2026-10-08.** The session ran on the maintainer's PC, not in the cloud, and the
  maintainer gave it the Deck. All three passed: the settings card (P83-J1-SETTINGS-CARD), the "Show N more"
  line (P83-J3-SHOW-MORE), the Terse switch (P83-J4-TERSE-TOGGLE). Evidence under `docs/test-evidence/plan83-*`.
- **J4's answer test:** ten Speed questions with Terse on, at least eight within three lines, run against real
  Ollama. Still owed.
- **J4's stacked buttons:** Opus, after a Deck measurement. Still owed. So are two things the trial found: a
  menu press asks for an "If you want to cheat" section, and each press nests the previous question inside the
  next one (both on the Terse roadmap entry).

## 8. Results

Ran 2026-10-07 23:00 to 2026-10-08 03:15, on the maintainer's PC with the Deck. Every winner landed on
`experimental` with every check green; the Deck checks for three of them passed.

### In plain words

- **Sonnet high is still the best all-round helper.** It won four of the six jobs and was never far off in the
  code jobs. It was the only setting that did the timing bug cleanly, which matches plan 75.
- **Haiku high is good at a mechanical fix, and much cheaper.** It won the first bug outright (24 of 25, the
  top score of the whole trial) for 32 cents, against $1.09 to $1.46 for Sonnet. On the clear two-star feature it
  came third, two points behind the winner, for less than half Sonnet high's cost.
- **Haiku is not ready for judgment work or bookkeeping.** On the timing bug both Haiku runs broke a back-end
  test, and Haiku high's report quoted a test result from before its change. On the three-star feature Haiku high
  left out the on-screen switch. On the paperwork both Haiku runs lost sentences while moving entries and said
  they had copied them whole: an automatic fail under § 4.
- **Haiku is careful in an unhelpful way.** Haiku high stopped twice when tests failed before it changed
  anything (the overloaded PC's fault), and once refused to carry on after being told it could. Haiku medium
  twice finished the work and then did not commit. Each needed a nudge. Sonnet runs needed one nudge in total.
- **Haiku is not always cheap.** Past 100,000 tokens in one request its price goes up five times. On the long
  jobs it cost a third to a half of Sonnet. On the timing bug Haiku medium took 308 steps and cost more than
  either Sonnet run.
- **Bookkeeping surprised in the other direction too:** Sonnet high scored worst on the paperwork (9 of 25,
  an automatic fail: it filed the new bug under the wrong heading while its report said otherwise, and rewrote
  rows it was not asked to touch). Sonnet medium, today's bookkeeper, won it.

### Scores, out of 25 (judged blind by Opus 5.5 extra-high; ✗ = automatic fail)

| Job | Sonnet medium | Sonnet high | Haiku medium | Haiku high | Landed |
|---|---|---|---|---|---|
| J1 leftover row number (★, mechanical) | 20 | 22 | 20 | **24** | Haiku high, plus Haiku medium's test |
| J2 autosave timing (★, judgment) | 15 | **23** | 17 | 15 | Sonnet high |
| J3 "Show N more" (★★ feature) | 23 | **24** | 16 | 22 | Sonnet high |
| J4 Terse mode (★★★ feature) | 18 | **22** | 15 | 11 | Sonnet high, plus one fix by the session (below) |
| J5 roadmap trim (bookkeeping) | 20 | **22** | 19 | 18 | Sonnet high |
| J6 paperwork (bookkeeping) | **18** | 9 ✗ | 14 ✗ | 14 ✗ | Sonnet medium, plus the judge's fixes |
| **Total of 150** | **114** | **122** | **101** | **104** | |

Must-fix items the judges found: J1 Haiku medium left the click handler's type still allowing the row number.
J2 Sonnet medium and Haiku high both broke the Ask hook's step-order test. J4: all four versions gave the AI two
clashing orders on a knowledge-base strategy question (the spoiler wording banned the menu the terse wording
required); the session fixed it in the winner (`e082e7a8`) with a test that fails without it, and a one-off
fingerprint showed Terse off, Strategy and Expert unchanged word for word. J5 Haiku high's roadmap pointer named
the wrong archive. J6: the winner repeated a wrong code location from the brief (the brief's mistake) and
dropped three entries' original status lines; both folded into the landing.

### Cost, time and effort per setting (all six jobs)

List prices of 2026-10-08: Sonnet 5.5 $2 / $10 per million tokens in / out, cache reads $0.20; Haiku 5.5 $0.10 /
$0.50, rising to $0.50 / $2.50 for any request over 100,000 tokens. Read from each helper's own log.

| Setting | Score | Cost | Minutes | Steps | Tokens read |
|---|---|---|---|---|---|
| Sonnet medium | 114 | $13.23 | 265 | 328 | 45 million |
| Sonnet high | 122 | $15.91 | 298 | 347 | 51 million |
| Haiku medium | 101 | $6.80 | 290 | 664 | 109 million |
| Haiku high | 104 | $5.50 | 277 | 474 | 86 million |

Per job, cost in dollars (S-M / S-H / H-M / H-H): J1 1.09 / 1.46 / 0.17 / 0.32; J2 1.13 / 1.66 / 2.86 / 0.38;
J3 2.19 / 2.93 / 0.77 / 1.20; J4 6.76 / 7.71 / 2.40 / 2.77; J5 0.88 / 0.80 / 0.23 / 0.48; J6 1.18 / 1.35 / 0.37 /
0.35. The judges cost $23.22 and the two Deck blocks $3.13 (Opus and Sonnet); the one running the session about
$20. The whole trial: about $88.

**Time is the weakest number.** The maintainer asked to start the feature and trim batches early, so up to 20
helpers shared the PC at once and every test run slowed down. All four runs of a job still started together, so
times compare fairly within a job, not across jobs. Haiku does more, shorter steps: about twice as many as Sonnet
for the same job.

### Things to know about this run

- One run per setting per job. Every "yes" below is a suggestion to try in a real session with the misses logged.
- The load made baseline tests time out. All 20 helpers got the same note about which failures were known, mid-run.
- The brief had two mistakes, the same for every run: J6 said two entries were under Bugs when they were under
  Features, and gave a wrong line for the growing-question problem. The judge did not mark anyone down for them.
- Haiku 5.5 accepted both medium and high effort, confirmed in its logs.

### Suggested routing, next to today's

| Work | Today | Suggested | Why |
|---|---|---|---|
| Mechanical fixes (known cause, one obvious way) | Sonnet medium | **Haiku high, on trial** | J1: best score, a quarter of the cost. One run; log every miss |
| Fixes that need a judgment | Sonnet high | Sonnet high | J2: only Sonnet high was clean |
| Features, one or two stars, clear spec | Sonnet high | Sonnet high (Haiku high a fair second) | J3: Haiku high 22 against 24 |
| Features, three stars and up | Sonnet high | Sonnet high | J4: Haiku 11 and 15 |
| The bookkeeper | Sonnet medium | **Sonnet medium, unchanged** | J5 and J6: Haiku missed the § 5 bar on both; Sonnet high failed J6 |
| The Deck driver | Sonnet medium | Sonnet medium | Not tested here; the two Deck blocks ran clean on it |

## 9. The maintainer's calls

1. **2026-10-08: the jobs.** The AI models box Filters feature is dropped (screen work, cannot be judged
   without the Deck). The two bugs are J1 and J2. The bookkeeping jobs are the roadmap trim and the
   after-landing paperwork. The winning version of each job lands on `experimental`.
2. **2026-10-08, during the run:** start the feature batch, then the trim batch, while the bug batch was still
   running (20 helpers at once, over the usual ten). Saved time; made the time numbers noisy.
3. **2026-10-08: yes.** Haiku high takes mechanical one-star fixes, as a trial, with each run logged in plan 33
   § 4d. Nothing else changes. Written into AGENTS.md, the routing reminder, plan 33 and a new helper file.
4. **2026-10-08: keep it as it is.** The roadmap's Done section stays a short pointer to the archive plus the
   newest closed lines; older closed entries live only in the archive.

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

## 11. Session summary (2026-10-08)

### What was built, and where

- **J1, the leftover row number** (`0456117b`, `787068ef`). The `selectedIndex` state is gone from `src/index.tsx`
  and everything it was threaded through: `MainTab.tsx`, `MainTabUnifiedAskBar.tsx` and its types, the Main tab
  payload hook, the session reset and restore hooks, `useSteamSettingsSearch.ts` (the click now passes only the
  setting), `useBonsaiAskOrchestration.ts`, `askOrchestrationArgs.ts`, and the saved session snapshot
  (`bonsaiSessionSurvival.ts`, `initialSessionSnapshot.ts`). An old snapshot that still carries the field restores
  fine; it is simply ignored.
- **J2, the late desktop-note autosave** (`c99bd6f6`). In `useBonsaiAskOrchestration.ts`, a finished reply that is
  painted before settings load is held in the same ref as the two autosave switches and saved once when settings
  arrive with both on; the save call itself moved to `src/hooks/saveReplyToDesktopNote.ts` to keep the hook under
  its growth limit. Tests in `useBonsaiAskOrchestration.desktopNote.test.ts`.
- **J3, "Show N more"** (`eddd7138`). `earlierTurnsByDay.ts` decides how many of an open day's questions show;
  `useEarlierTurnsPill.ts` keeps the per-day count and resets it on close; `buildEarlierList.tsx` and
  `EarlierListLine.tsx` draw the new line; `chatTranscriptNavHelpers.ts` wires its Down and Up and hands the ring
  to the first new question; `MainTabChatTranscript.tsx` changed by a few lines. Route in `docs/focus-graph.md`.
- **J4, Terse mode** (`9f007be6`, `d25df219`, `87a4dd78`, `2e8aa942`, `e082e7a8`). The `terse_mode` / `terseMode`
  setting through both languages' settings tables, contracts and read-back test; the switch in `OllamaTab.tsx`,
  wired into the slider-to-Thinking D-pad chain by hand; the three-line wording in `reply_style_blocks.py`, chosen
  in `ollama_prompts.py`, with the character reminder in `ai_character_service.py`; `ollama_service.py` now reads
  the branch menu out of a Speed reply when Terse is on; `strategy_spoiler_policy.py` stops banning that menu on a
  knowledge-base question under Terse. Tests in `tests/test_terse_mode_prompt.py`, `OllamaTab.terseMode.test.tsx`.
- **J5 and J6:** `docs/roadmap.md` 89.5 KB to 59.9 KB (finished entries to `docs/archive/roadmap-done-v0.5.0.md`),
  then the paperwork for all of the above.

### What popped up, and what was done about it

- **Twenty helpers on one PC timed out the tests.** Tests that pass alone failed at the start of almost every
  run. Every helper got the same note listing the known failures. Next time: keep to ten, or tell helpers to run
  only their own tests while working, from the start.
- **Two landings clashed.** J2's new test still passed the row number J1 had removed; a one-line fix, folded in.
- **The Terse brief was wrong about focus.** AGENTS.md says a plain toggle in an existing section needs no wiring;
  in the Ollama tab the slider and the Thinking row name each other directly, so it did. Three of four helpers
  noticed and wired it.
- **The judge caught a bug in every Terse version** (the menu ban on knowledge-base questions), and a second one
  nobody had seen (each menu press nests the previous question). The first is fixed; the second is on the roadmap.
- **The settings card jump never scrolled to the setting.** Not new, found by the Deck check; filed as its own bug.
- **Another chat committed to `experimental` mid-session** (`c775692b`, a Windows stand-in fix). Left alone.

### What the maintainer could do differently next time

- Say up front whether the session runs on the PC or in the cloud: the plan assumed the cloud, so the Deck checks
  were written as owed and had to be re-planned.
- Pick the batch size before the start. Running all batches at once saved about an hour but made the time
  comparison weak.
- Wake the Deck before stepping away; it slept once and held up the Deck checks.

## 12. In simple terms: how this plan was carried out

A trial like this has four moving parts, and they live in the session's scratch folder, not in the repo:

1. **Copies.** Each helper got its own copy of the repo, made with `scripts/worktree.py create` from a branch
   pointing at the commit before the plan. A hidden list said which copy got which setting.
2. **Briefs.** One brief per job, word for word the same for all four runs; only the copy's path changed. Each
   brief was written into the copy itself, and the helper was told to read it.
3. **Blind judges.** For each job, a script gathered the brief and each helper's final report, removed model
   names, and labelled them A to D in shuffled order. An Opus helper read the code, ran the checks itself, and
   wrote a scorecard before it saw the reports.
4. **Usage.** A script read each helper's own log, kept the largest usage figure per reply, and priced every
   reply on its own (Haiku's price depends on the size of each request).

Winners landed with `scripts/land_lane.sh` in the plan's order, with every check run after each. The Deck checks
were written as step lists and run by the Deck helper; its evidence files are in `docs/test-evidence/plan83-*`.

## 13. The overnight Deck session (2026-10-08, 04:10 to 06:40)

The maintainer gave the Deck for the night and asked for the roadmap's waiting checks to be run. A read-only helper
sorted the 25 waiting entries: 5 the rig could run, 17 that need the maintainer (a finger, the mic, ears, a PIN, a
call), 5 that cannot run here. Five Deck blocks ran; the bookkeeper wrote every result into the roadmap and testing
documents.

- **Passed:** closing "Show details" at the top of a scrolled answer; the Show details line's walk in and out; long
  suggestion chips with a game running (timing, fade, holding still under the ring).
- **Unclear, still owed:** the walk's two directions differ where the slot swaps between the Show details line and
  chips; the "continued" mark inside a hidden block (the case never arose); short-chip centring; the notes block
  with a game running.
- **Terse mode's ten-question test ran three times** with Deep Rock Galactic: Survivor. Length held in 10, 9 and 7
  of 10 answers (26 of 30). The menu of choices first showed on only 4 of 10, because the Deck's model spelled the
  menu's fence with an underscore. Fixed overnight by the new Haiku high helper (`21f62344`, 24 cents); the last run
  showed the menu on 10 of 10.
- **One wrong turn, owned:** the first run's driver read the code box as "a menu with no fence", and a Sonnet high
  fix was built on that reading (`2ccf4075`) before anyone checked the saved answer. That case was never actually
  seen. The code is tested and only acts with Terse on; **the maintainer's call:** keep it or take it out.
- **New findings on the roadmap:** a continued answer's saved text repeats paragraphs; "No close match in my notes"
  shown while notes were attached; Terse repeats an earlier answer's menu; the slot swap above.
- **The maintainer's call on Terse length:** the test asks for 8 of 10 in one run; one run passed (10), one passed (9),
  one did not (7).
