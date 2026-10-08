# Plan 33: which model and effort to use for what

**Status: POLICY since 2026-09-05 (D59, all five calls locked; Haiku is on a measured trial, § 4a). Helpers moved from
Sonnet 5 high to Opus 5.5 medium/low on 2026-09-26, the maintainer's call after two blind trials (§ 4b).** The short form lives in
[AGENTS.md, 'Which model does which work'](../../AGENTS.md); this file is the evidence and the long form. A prompt-time hook hands every
implementation kickoff the short table and asks for a gentle heads-up when the session is outside it; it never blocks.

## Executive summary (plain language)

Every one of the 84 sessions since 2026-08-02 records which model ran each turn and at what effort, so this
is measured, not guessed. Three things matter:

1. **The model tier is the expensive lever, not the effort setting.** Raising Opus from high to max costs
   about 25% more per turn. Switching from Opus to Fable costs 2.5 to 3 times more per turn, and Fable 5.1
   at max writes 4.5 times more output per turn than Opus high. Eight of the ten times a session stalled on a
   usage limit, it was a Fable 5.1 max session.
2. **Cheap models did the ★ to ★★★ work fine when the cause was known.** Five Sonnet lanes shipped five
   features on 2026-08-28 that all passed on the Deck, for about $60 total.
3. **Focus and layout bugs fail on the device at every model tier.** Opus high, Opus xhigh, and the Sonnet
   lanes all shipped green-under-tests fixes that were dead on the Deck. What fixed them was measuring
   first. No model choice substitutes for that.

Checklist for this plan:

- ✅ Evidence gathered from the transcripts and commits (§ 5)
- ✅ Routing table drafted (§ 2)
- ✅ Prompt-time reminder hook installed (§ 6)
- ✅ Roadmap maintainer note added
- ✅ Maintainer review (D59, 2026-09-05: table, orchestrator, lane scope and AGENTS.md placement locked)
- ✅ Short form copied into AGENTS.md, 'Which model does which work'
- ✅ Bookkeeper helper and guard installed (2026-09-06, § 6)
- ⬜ Haiku trial: ten lookups logged in § 4a, then keep or drop

## 1. What each model costs here

Measured across every turn in every session, priced at API list rates with cache reads included. The
numbers are dollar equivalents; the account runs on a subscription, so the real limit is the usage window,
which the same ratios drive.

| Model and effort | Cost per turn | Output tokens per turn | Where it was used |
|---|---|---|---|
| Sonnet 5 high, as a lane subagent | $0.04 to $0.08 | ~170 | bug and feature lanes |
| Sonnet 5 high, main session | $0.07 | ~760 | implementing from an Opus plan |
| Opus 5 medium | $0.10 | ~680 | explanations, tooling fixes |
| Opus 5 high | $0.16 | ~760 | most of August |
| Opus 5 xhigh | $0.19 | ~970 | the refactor, the plans |
| Opus 5 max | $0.20 | ~1,100 | late August |
| Fable 5 high | $0.40 | ~1,130 | 08-22 to 08-31 |
| Fable 5.1 max | $0.45 | ~3,430 | 09-01 onward |

Plan documents written by Fable 5.1 max run 7,000 to 9,400 words (plans 30 and 31). The Opus plans for
comparable scope run 3,300 to 5,500. Planning the ★★ "one-line preset row" fix on Fable max cost about
$200 and hit a usage limit part way.

## 2. The routing table

"Plan" means: read the code, decide the approach, write the decisions and the lane briefs. "Implement"
means: write the code and tests. "Land" means: review each diff, cherry-pick, keep the docs honest.
"Deck" means: drive the device and interpret what it says.

| Work | Plan | Implement | Land and review | Deck |
|---|---|---|---|---|
| ★★★★★ and ★★★★★★ feature | Fable 5.1 max, decisions and briefs only, not a 9,000-word document | Sonnet 5.5 high lanes | Opus xhigh | Opus xhigh or the orchestrator |
| ★★★ and ★★★★ feature or bug | Opus xhigh | Sonnet 5.5 high lanes when the cause is known; Opus xhigh itself when it is not | Opus xhigh | same |
| ★ and ★★ feature or bug | none, or Opus xhigh in the same session | Sonnet 5.5 high; Sonnet 5.5 medium when the fix is mechanical | Opus xhigh if it touches focus or settings plumbing, else none | same |
| Focus and layout (`[focus]`, `[layout]`, `[ui]`) | Opus xhigh, **after** a device measurement | Opus xhigh with the measurement in hand; Sonnet only for a fix whose cause the measurement already named | Opus xhigh | required; no fix is done until the row passes |
| Pixel polish (dots, rings, fonts) | do not use Fable; the tools cannot see pixels | Opus xhigh with a measurement, else a human | | human eyes |
| Backend and retrieval (`[KB]`, `[ollama]`) | Opus xhigh | Sonnet 5.5 high | Opus xhigh | the eval harness, not the Deck |
| Refactor | Opus xhigh (§ 3) | Sonnet 5.5 medium lanes for moves; Opus xhigh for behavior-touching steps | Opus xhigh | after each landing batch |
| Docs, roadmap bookkeeping, plain explanations | | the `bookkeeper` helper (Sonnet 5.5 medium); every status it changes names its evidence | | |
| Read-only lookups with a checkable answer | | Haiku 4.5 on trial (§ 4a) or Sonnet 5.5 low | the caller greps to confirm | |
| Deck QA driving | Opus xhigh writes the rows and expect strings | the `deck-driver` helper (Sonnet 5.5 medium) runs rows already written | Opus xhigh reads the failures | |

Escalation rule: go up one tier only after the tier below has failed **on the device** twice with a
measurement in hand. Going up because a fix "feels hard" is what the history says does not help.

Effort on Opus: use xhigh for anything that writes code or a plan. High to xhigh costs 20% more per turn
and the refactor, the plans, and the landings were all done there. Medium is for explanations and tooling
fixes. Max on Opus bought nothing measurable over xhigh.

### 2a. Max effort and ultracode

**Max.** On Opus, max cost 5% more per turn than xhigh here and no session shows a result xhigh did not get;
use xhigh. On Fable, max is where nearly all the Fable turns ran, and it is the setting that produced the
9,000-word plans and eight of the ten usage-limit stalls. Use Fable max for exactly two things: the decision
list and lane briefs for ★★★★★ scope, where a wrong call costs more in lane rework than the plan costs; and
root-causing a bug that has already failed on the device twice with a measurement in hand. For everything
else on Fable, high is the same tier at a fifth of the output. Raise effort only when the level below has
been tried and measured, never as a default.

**Ultracode.** Ultracode is xhigh effort plus standing workflow orchestration: the session may spawn a
workflow of many agents on its own. It has run once here, on 2026-08-30, as ten Fable 5 xhigh read-only
fact checkers over plan 28 for about $62; the plan's citations came back clean and the build still missed
the mockup's shape, because checking a plan against the code is not checking it against the drawing.
Use a workflow only for read-only fan-out with independently checkable pieces: verifying every citation in
a plan, reviewing one large diff across several dimensions, auditing a batch of KB cards, running many
lookups at once. Pin the worker model to Sonnet 5 or Haiku 4.5, which brings that $62 to under $10. Do not
use it for implementation (lanes in worktrees are the right shape, and only one driver can hold the Deck),
for anything ★–★★, or as a session default, because it also forces xhigh on every turn.

## 3. Refactoring: how to break it down

The August refactor (phase 0 through step 11, 2026-08-02 to 08-05) ran on Opus xhigh at about $7 per
commit with tests green between commits and every decision written to the roadmap as a D entry. The only
problems surfaced on the device afterward (a voice install reset, "lost work" in main.py, a focus
regression), which is the same pattern as everywhere else. The refactor rules in AGENTS.md
(one refactor per commit, never mix a move with a rewrite) held up and stay.

Break a refactor into these pieces and route each one:

1. **Recon.** Produce the inventory: which files, which symbols, who imports what, which tests assert
   shape rather than behavior. This has a checkable answer, so it is lane work. Sonnet 5 high subagents,
   read-only, citing `file:line`, with `import-graph.json` and `git log -S` as the tools. The step 11
   friction test used three Opus xhigh "new contributor" agents at about $50; Sonnet would have produced
   the same file list for a fifth of that.
2. **The plan and the decisions.** Opus xhigh, one session, writing the phases and the D entries. The
   refactor plan and D1 through D15 were written this way and none needed redoing. Fable is not needed.
3. **Mechanical moves.** Extract a module, move a hook, rename, relocate tests. One move per commit, gates
   green, no behavior change. Sonnet 5 high lanes with a precise brief. Never more than three lanes on a
   refactor at once: the moves share files, and plan 32 § 4 measured that merge churn beyond five lanes
   costs more than the parallelism buys; refactors overlap more than bug lanes do.
4. **Behavior-touching steps.** Anything that changes what a function returns, a settings normalizer,
   an RPC name, or the focus registry. Opus xhigh does these itself, not a lane, because the diff needs
   judgment and the tests may need rewriting rather than moving.
5. **Landing.** Opus xhigh reviews each lane diff against the rules, cherry-picks oldest first, and runs
   all four gates on the merged tree before the next lane lands.
6. **Device check after each landing batch.** Serial, one driver. A refactor that "changed nothing" has
   regressed on the Deck before (seven regressions re-applied 2026-07-06).

Two traps the history already paid for: a lane worktree spawned 442 commits behind the branch
(2026-08-23 and 08-28), so every lane's first act is the ancestry check; and tests that asserted
implementation shape had to be rewritten, not the code contorted (docs/audit/00-phase0.md).

## 4. Subagents: does orchestrator plus Sonnet lanes work?

Yes, for cause-known work, and every failure so far was operational rather than a model problem.

| Date | Orchestrator | Lanes | What happened |
|---|---|---|---|
| 08-23 | Opus high | 8 Sonnet high | Ten bugs fixed; seven owed a Deck run. Two lanes died on the monthly spend limit. Two lanes wasted their whole run on a stale worktree base. Device results mixed: card floors passed, blank question and the advice guard failed. |
| 08-28 | Fable 5 high | 5 Sonnet high | Five ★★ to ★★★ features. All five verified on the Deck the same day. About $60 in total. |
| 08-28 | Fable 5 high | 3 (Sonnet high, Fable 5 high) | KB lanes. One lane found its base 442 commits behind and reset itself; the bookkeeping lane had to redo both fixes. |
| 08-30 | Fable 5 xhigh | 10 Fable 5 xhigh read-only fact checkers | Checked plan 28 line by line. The implementation still built the preset row the wrong shape; fact-checking a plan does not check it against the mockup. |
| 09-03 | Fable 5.1 max | 4 desk-half agents | Docs bookkeeping while another chat held the Deck. Worked; one agent died on the session limit. |
| 09-04 | Fable 5.1 max | 6 Sonnet lanes | Thirteen bugs. Lanes C, E, F passed the device first try. Lanes A, B, D (all focus bugs) needed two or three redos each. Lanes cost $237; the orchestrator about $290. |

What to keep doing:

- Lane briefs that carry the ancestry check, the file ownership, one fix per commit, and the four gates.
- Ten lanes at most for bug or feature work (the maintainer raised it to seven on 2026-09-28 and to ten on 2026-09-29; refactors stay
  at three). *Superseded 2026-09-26:* this used to say Sonnet 5 high is the right lane model. Two
  blind trials (§ 4b) ranked Opus 5.5 medium above it on quality and below it on cost, so lanes run on Opus
  5.5 medium now, low for mechanical fixes. What still holds: no model passes a focus fix without a measurement.
- The orchestrator reviews every diff against the focus law and drives the Deck serially.

What to change:

- **The orchestrator does not need Fable for a bug session.** It spent its effort reviewing diffs,
  resolving docs conflicts, and driving the Deck. Opus xhigh does all three, and the orchestrator was
  more than half the session cost on 09-04. Use Fable only when the same session also plans ★★★★★ scope.
- **Lanes should not edit the roadmap, testing rows, or the changelog.** Plan 32 had lanes move their own
  rows and the orchestrator then spent turns resolving the conflicts. Lanes return code, tests, and a
  one-paragraph report; the bookkeeping is done by the bookkeeper helper, briefed by the orchestrator, in
  one commit per landing.
- **Check the lane effort actually took.** Settled 2026-09-06: across every helper transcript on this
  machine, the bugfix-lane and feature-lane helpers (front matter `effort: high`) ran every turn at high
  (1,111 and 899 turns). The "max" turns the plan saw were general-purpose helpers with no front matter,
  which inherit the parent's effort (2,874 Sonnet turns at max, all from Fable-max parents). So the front
  matter is honored; a helper with no front matter runs at whatever the main chat runs at.
- **Do not launch lanes near a usage-limit reset.** Two lane runs on 08-23 and one on 09-03 were killed
  mid-task and had to be relaunched from scratch.

### 4a. The Haiku trial (D59 #4, locked 2026-09-05)

Haiku 4.5 is on trial for the read-only lookups above. The rule: **measure it, and if Sonnet has to step in,
drop it.** Every Haiku use gets a row here. The caller confirms the answer with a grep before acting, and a
row is a miss when the answer was wrong, incomplete, or a Sonnet or Opus agent had to redo the lookup.
Verdict after ten rows: keep it if two or fewer misses; drop it and strike this section otherwise.

| Date | Session | What it looked up | Confirmed correct? | Sonnet or Opus had to step in? |
|---|---|---|---|---|
| | | | | |

### 4b. The lane model trial: Sonnet high, Opus low, Opus medium (proposed 2026-09-26, the maintainer's idea)

Which lane model gives the best fix per unit of usage? Nothing measured Opus low or medium as a lane yet.
First run in the release bug session ([plan 72](72-release-bug-session.md) § 3): a few tasks done two or
three ways from the same brief and start point, reviewed blind (labelled A, B, C), the best one landed.
Efficiency numbers come from a script that reads each helper's log, priced the way § 1 was.

**Verdict rule:** a cheaper model wins if its quality numbers are no worse; a dearer one must show fewer
review problems or fewer redos to earn its cost. Say plainly how many rows the verdict rests on. Screen
work (`[focus]`, `[layout]`, `[ui]`) stays out of the paired runs.

| Date | Task | Label | Model and effort | Checks green first time? | Review problems | Rounds to land | New tests fail without the fix? | Deck first time? | Tokens in / out / cache read | Turns | Tool calls | Minutes | $ at list |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 2026-09-26 | Stop keeps the model loaded (★★) | C | Sonnet 5 high | Yes (full Python suite 1,974 green); quick check red only on the roadmap size limit, already red at the base | Blind score 18/25. Should fix: no check at all on the old "work keeps running" worry, and a docstring claim that is false for a Stop before the first word; a background thread whose only job is one log line; three functions kept that nothing calls. Its tests only intercept the named steps. Plus: the only one that fixed the second file's stale diagram | Not landed | Yes — 2 of 12 fail on behaviour | Not run | 134 / 37,193 / 6,923,533 (147,377 cache write) | 67 | 66 | 14.9 (PC to itself) | $2.13 |
| 2026-09-26 | same | A | Opus 5.5 low | Yes (1,978 green); same roadmap-size note, which it disclosed | Blind score 15/25. **Should fix, and fails the goal:** one 2-second reading 4 s after Stop, so a Stop while the model still "thinks" usually unloads anyway — the commonest Stop. Also: no owner check on the processes it measures; stale diagram left in the second file; the new-question check in the main file untested | Not landed | Its own check: 3 failed with the old unload back. Mine: the new tests cannot load without the fix | Not run | 32 / 16,125 / 928,769 (52,450 cache write) | 16 | 16 | 7.6 (shared the PC) | $0.77 |
| 2026-09-26 | same | B | Opus 5.5 medium | Yes (1,989 green); same roadmap-size note, disclosed; skipped the build step, said so | **Blind score 21/25, the reviewer's pick.** Should fix: the same stale diagram in the second file. Minor: a new question is only seen once its model call begins; a long unrelated job busy for 90 s straight would still be stopped; a test that only checks a number. Strengths: watches the worker over time, clear outcome on every path including "can't measure", keeps the owner check, fake clock with no real sleeps, tests the real Stop wiring | Not landed yet | Its own check: 9 failed with the old unload back. Mine: the new tests cannot load without the fix | Not run | 68 / 43,353 / 2,775,055 (93,658 cache write) | 34 | 40 | 16.4 (shared the PC) | $1.89 |

Priced at list: Opus 5.5 $4 in, $20 out; Sonnet 5 $2 in, $10 out; cache reads $0.20 per million on both (the
figures below use that; corrected wording 2026-09-28), cache writes 1.25 times the input price. The blind review itself (Opus 5.5 at the session's high effort) cost $0.82 and 2.6 minutes.

**First verdict (2026-09-26, one task, three runs — a small sample, so provisional):**

- **Opus medium gave the best fix and still cost less than Sonnet high** ($1.89 against $2.13). Sonnet's cost
  is mostly re-reading its own growing context: 67 short turns re-read 6.9 million cached tokens. Opus medium
  took half the turns. By the rule above, a model that is no dearer and scores better wins outright.
- **Opus low was the cheapest by far** ($0.77, half the time, a quarter of the turns). But its fix fails the
  task's own goal in the commonest case. Cheap only counts when the fix holds, so it does not replace Sonnet
  high for fixes that need judgment. It stays a candidate for purely mechanical work, untested so far.
- **Provisional routing change:** cause-known lanes default to **Opus 5.5 medium** instead of Sonnet 5 high,
  until more rows say otherwise. Add a row every time a lane runs; revisit after five more.
- Caveats: one task, one run per model; the Sonnet run had the PC to itself while the two Opus runs shared
  it, so their minutes are, if anything, a little high; my own "take the fix out" check could not tell the
  two Opus runs' tests apart, because their tests call new code that does not exist without the fix.

**Second trial, bookkeeping (2026-09-26).** The roadmap's own `[docs]` bug: 26 blocks on the details page that
nothing linked to, plus test rows whose status contradicted their notes. Same brief, same starting commit
(`107f83d2`), each helper in its own copy, reviewed blind. A script counted the unlinked blocks before and after.

| Date | Task | Label | Model and effort | Unlinked blocks after (of 26) | Blind score | Review problems | Tokens in / out / cache read | Turns | Tool calls | Minutes | $ at list |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 2026-09-26 | Docs sweep | C | Sonnet 5 high (the `bookkeeper` helper as it was) | 3 — and all 3 did have a home | 14/25 | **Lost facts:** dropped headings and a sentence, reworded a note, 3 broken links in moved text; 8 open blocks linked only from an old archived plan, where nobody looks | 554 / 167,537 / 74,138,632 (381,532 cache write) | 277 | 283 | 35.0 | $17.46 |
| 2026-09-26 | same | B | Opus 5.5 low | 0 | 20/25 | Nothing lost. **Must fix:** left one test row saying "owed" though the evidence says it passed, while its closing note claimed every "owed" row was really owed; wrote that a check "passed by probe only" with nothing to support it | 126 / 37,479 / 6,855,146 (133,919 cache write) | 63 | 62 | 9.1 | $2.79 |
| 2026-09-26 | same | A | Opus 5.5 medium | 0 | **22/25, the pick** | Nothing lost. Should fix: one row's closing sentence still contradicts its new status; left one row "Done" whose notes list two owed checks | 192 / 68,001 / 17,406,367 (268,600 cache write) | 96 | 98 | 14.1 | $6.19 |

**Bookkeeping verdict:** Opus medium was best and Opus low close behind at 45% of its cost. Low's worst slip was
a claim the evidence does not support. **The maintainer's call (2026-09-26): the `bookkeeper` helper runs on Opus
5.5 low**, for the cost and speed. The guard for that slip: every test status the bookkeeper changes must name
the evidence file it rests on, and the session that briefed it spot-checks those changes before they land. Record
each bookkeeper run here; if a made-up result gets past the spot-check, move it back to medium. Sonnet 5 high was last on quality and six times the cost of Opus
low: 277 short turns re-read 74 million cached tokens.

**Long jobs.** This sweep is the long, token-heavy kind of job. Dropping from medium to low saved 55% and five
minutes, and lost two points, both on judgment calls. Rule: low when every step is the same checkable kind;
medium when steps carry decisions. Untested so far and worth a row: a low run followed by one medium review pass.

**Routing adopted 2026-09-26 (the maintainer's call, after both trials):** helpers on Opus 5.5 medium by default,
Opus 5.5 low for mechanical fixes and moves, decided by whether the fix needs a judgment rather than by stars.
The bookkeeper runs on Opus low (the maintainer's call, see above). AGENTS.md, the reminder hook, the roadmap
note and the helper settings files were updated the same day.

**Third trial, D-pad fixes on Opus high (2026-09-28, [plan 74](74-release-wave-two.md) lane 3, the maintainer's
call).** The table above sends D-pad work to Opus xhigh. The maintainer asked for one lane of D-pad fixes whose cause
the Deck had already shown to run on Opus high instead, and to measure it. No paired run (screen work stays out of
paired runs); the wave's other lanes give a rough comparison, on different work. Usage priced from each helper's log
the way § 1 was, taking each reply's largest usage count.

| Date | Task | Model and effort | Checks green first time? | Review problems | Rounds to land | New tests fail without the fix? | Deck first time? | Tokens in / out / cache read | Turns | Tool calls | Minutes | $ at list |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 2026-09-28 | Round 1: six D-pad fixes (five ★, one ★★) | Opus 5.5 high, **run as its own session** | 5 of 6 (one file-size refusal; the lane raised that file's limit by 4 lines, with a reason) | None must-fix. Noted: one box rebuilt on a base part the repo had not used before; a new wrapper that might shift Helpful (measured on the Deck: it did not) | 1 for five fixes, 2 for the ★★ | Yes, all six | **5 of 6.** The sixth, the ★★ spoiler cover, worked for the last cover and failed for a cover at the top of the answer: the one case its own report had flagged as unmeasured | 398 / 156,042 / 51,970,640 (421,652 cache write) | 199 | 250 | ~41 of work (56 in the log) | $15.63 (first written as $26.02, see the note below) |
| 2026-09-28 | Round 2: the top cover | Opus 5.5 high, a normal helper | Yes | None | — | Yes (3 of 5 new tests; the other 2 guard its limits and were broken on purpose) | **Yes**: Up landed on the first cover and A opened it | 52 / 34,844 / 2,643,882 (98,973 cache write) | 26 | 29 | 10.5 | $1.72 (first written as $2.25) |

The rest of the wave, for comparison (different kinds of work, so only a rough guide):

| Lane | Model and effort | Bugs (commits) | Deck first time | $ at list | $ per commit |
|---|---|---|---|---|---|
| 1, the release download and licences | Opus medium | 4 (4) | Not checkable on the Deck until the release download is built | $4.99 | $1.25 |
| 2, answers and chats | Opus medium | 6 (7) | 5 of 5 checked | $5.72 | $0.82 |
| 5, back end | Opus medium | 3 (3) | 2 of 2 checked; the third cannot be made to happen on the Deck | $3.40 | $1.13 |
| 4, looks | Opus xhigh (general helper at the session's effort) | 3 (5) | 5 of 5 | about $10.70 | about $2.14 |
| 3, D-pad, both rounds | Opus high | 6 (7) | 5 of 6, then the sixth on round 2 | $17.35 | $2.48 (see below) |

**Pricing slip, corrected 2026-09-28 ([plan 75](75-sonnet-5-5-trial.md) § 10).** This trial's first write-up
priced Opus 5.5 cache reads at $0.40 per million; the list price is $0.20. Every figure in the two tables above is
re-priced from the same token counts; lane 4's log has grown since, so its figure is scaled from the ratio. The
verdict does not change.

**Verdict (provisional: one lane, six bugs, seven commits):**

- **Quality: Opus high met the Deck bar for D-pad fixes with a measured cause.** Five of six passed on the Deck
  the first time, the review found nothing that had to be sent back, and the one miss was the case the lane had
  itself flagged as unmeasured. Every lane in this wave passed the Deck at a similar rate, so these numbers do not
  separate the models; they show Opus high did not fall below the others.
- **Cost: round 1's $15.63 is not a fair number.** The app loads a new helper setting only when a session starts, so
  round 1 ran as its own session, which carries a far bigger standing context: it grew to 436,000 tokens, and
  52 million cached tokens were re-read. Round 2, a normal helper at the same setting, cost $1.72 for one hard ★★
  fix in 10.5 minutes, close to the medium lanes' cost per fix.
- **Suggestion for the maintainer (not adopted):** let D-pad fixes with a Deck-measured cause run on an Opus-high
  helper, with Opus xhigh still reviewing and landing them. Measure one more wave with Opus high as a normal helper
  from the start, to get a clean cost per fix, before changing the table.

**Fifth trial, D-pad fixes on Sonnet 5.5 high ([plan 76](76-release-wave-three.md), 2026-09-29, the maintainer's call).** Both D-pad lanes
(2 and 3) ran on Sonnet 5.5 high instead of Opus, to measure it. No paired run; screen work stays out of paired runs.

- **Result:** 11 D-pad fixes were checked on the Deck and 10 passed the first time. Lane 2: 9 of 9. Lane 3: 1 of 2. The miss was the cover walk:
  Down looped past a closed first cover, which traps the player. Neither the lane's tests nor the session's review before landing caught it,
  because the tests did not model Steam's own scroll-into-view on focus. Round 2 fixed it and passed on the Deck.
- **Compare:** Opus high passed 5 of 6 the first time in plan 74 (the third trial above).
- **Suggested, not adopted:** Sonnet high for D-pad fixes with a measured cause, provided every brief requires tests that model Steam's
  scroll-into-view and the session reviews for loops, not only for landing spots.
- **Also:** the ★★★ trap fix (lane 7) was done on Opus xhigh, per the house rule, and passed its one Deck try.
- Evidence: the plan 76 Results section and Deck blocks 2b and 3; no token or cost figures were taken for this trial.

### 4c. The Sonnet 5.5 trial (2026-09-28, the maintainer's idea)

Five settings (Sonnet 5.5 low, medium, high; Opus 5.5 low, medium) each did the same five jobs, reviewed blind:
a simple fix, a fix needing judgment, a feature, a bookkeeping replay and a Deck check list. Full tables in
[plan 75](75-sonnet-5-5-trial.md). In short: Sonnet 5.5 no longer runs up cost the way Sonnet 5 did; Sonnet high
scored best overall (82 of 100) and Opus medium next (81); only those two passed the judgment job; no Deck run
passed a check that should fail. One run per setting per job. **Adopted 2026-09-28, the maintainer's call:** every
helper moves to Sonnet 5.5 -- high wherever an Opus medium helper ran (features, knowledge base, fixes that need a
judgment), medium for mechanical fixes and moves, the bookkeeper and the Deck helper. Opus stays for whoever
plans, orchestrates and lands. The table in § 2 is updated; keep adding a row per helper run.

### 4d. The Haiku 5.5 trial (2026-10-08, the maintainer's idea)

Four settings (Sonnet 5.5 medium and high, Haiku 5.5 medium and high) did the same six jobs, judged blind by Opus
5.5 extra-high: two bugs, two features, a roadmap trim and the paperwork after landing. Full tables in
[plan 83](83-haiku-5-5-trial.md) § 8. In short, of 150: Sonnet high 122, Sonnet medium 114, Haiku high 104, Haiku
medium 101. Haiku high won the mechanical bug (24 of 25, a quarter of Sonnet's cost) and came close on the clear
two-star feature, but fell short on the timing bug, the three-star feature and both bookkeeping jobs, where every
Haiku run either missed by more than two points or lost sentences while saying it had not. Haiku 5.5's price
rises five times on any request over 100,000 tokens, so on the long jobs it cost a third to a half of Sonnet, and
once, on the timing bug, more than Sonnet. One run per setting per job. Suggested, not adopted: see plan 83 § 9.

## 5. Where Haiku fits

Haiku 4.5 has been used once here: a six-turn documentation lookup on 09-04, for under a dollar. There is
no evidence either way about it doing more, which is why § 4a is a trial with a log and a drop rule.

**2026-10-08:** Haiku 5.5 gets a full trial on real bugs, features and bookkeeping, judged blind against Sonnet:
[plan 83](83-haiku-5-5-trial.md). The "not a fit" list below is what that trial tests.

Where it is a safe fit, because the answer can be checked by the caller:

- Read-only lookups that return `file:line` or a list: who imports a symbol, which testing rows name a
  feature, which D entry locked a call, what a QA row's expect strings are. The orchestrator confirms
  with a grep before acting.
- Fetching documentation and summarizing a log tail or a `runs/` evidence file into a few lines.
- The default model for `prompt` and `agent` hooks, for example a post-commit check that the roadmap row
  moved with the fix.

Where it is not a fit:

- Editing the roadmap, testing docs, or archive files. The structure rules and the duplicated archive
  entries tripped Sonnet on 08-28; Haiku would do worse.
- Anything that presses a button on the Deck or judges pass and fail. The rig returns structured
  visibility verdicts, so vision is not the problem; judgment is. Sonnet medium got stuck polling a
  sleeping Deck on 08-12 and Haiku has less headroom than that.
- Writing code or tests, however small.

Honest cost note: all Sonnet lane work in the whole record cost about $360. Replacing half of it with
Haiku saves perhaps $150 a month, against $1,150 spent on Fable 5.1 max turns in four days. Haiku is a
tidy-up, not the lever. The lever is which tier runs the main session.

## 6. The reminder

A `UserPromptSubmit` hook in `.claude/settings.json` runs `.claude/hooks/model-routing-check.py` on every
prompt. Both files sit under `.claude/`, which git ignores, so the reminder lives on the maintainer's machine
only. When the prompt reads like the start of a bug fix, feature, refactor or lane session ("implement",
"fix the", "go ahead", "start on", "let's tackle", "work on", "land", "redo", "refactor", "lanes"), it reads
the session's own transcript for the model and effort of the last turn, and hands the session the short
routing table plus one instruction: find the roadmap entry's stars and tag, compare, and if the running
model or effort is outside the table, open the reply with one gentle sentence saying so and naming the
recommended row, then carry on. If it matches, the session says nothing. On a session's first prompt there
is no turn yet, so it reports the user-settings default and says so. It never blocks. Confirmed live
2026-09-05: it fired on the prompt that asked for this section.

A second hook, the bookkeeper guard, works differently: it refuses instead of reminding. If a session
running on Fable tries to edit the roadmap, the testing docs, the changelog, or a test file itself, the
guard stops that edit and tells the session to hand the batch to the `bookkeeper` helper instead, with a
brief that says what a person will notice and what each row should read. It never fires inside a helper,
on Opus or Sonnet, or on a plan, a memory file, or a scratch file. Setting `BONSAI_BOOKKEEPER_GUARD=off`
turns it off for one session. It lives under `.claude/` on the maintainer's machine, git-ignored, the same
as the reminder. Fifteen fake-call checks passed on 2026-09-06. It is a refusal rather than a rule because
a rule can drift out of a long chat's attention, while a refused call cannot be missed. The honest limit:
the guard only changes who types the file. Every reply the maintainer reads in the chat is still written
by the main model running the session; the guard cannot move that.

## 7. Evidence

- **Sonnet medium explained, Opus medium measured (2026-08-12).** On the QAM black dead space, Sonnet
  medium read the height guard and called it a deliberate tradeoff. Opus medium measured the live DOM and
  found Steam's own pane is also 300px inside an 806px container.
- **Sonnet medium driving the Deck (2026-08-12).** Twelve poll notifications, the Deck slept and crashed,
  the maintainer switched to Opus xhigh to continue.
- **Opus high missed the focus root cause; Fable 5 high found it (2026-08-27, commits 3321cb2 and
  31423e7).** The device rejected the Opus fix; the Fable session measured that keydown never fires and
  Steam only calls onMoveDown. That is the "focus law" plans 26 and 32 cite, after four regressions.
- **Fable 5 high built the preset row the wrong shape (2026-09-01, commit fc1b245).** Collapsed three
  rows into one chip and reported a verified win; the mockup had chips side by side.
- **Opus max on the indicator dots (2026-08-30).** Three rounds of "verified on device" and the maintainer
  still saw an oval fourth dot. Deck screenshots were broken (DPS finding P2-4) and the focus rig is a DOM
  hit test, so no model could see the pixels.
- **Focus fixes fail on device at every tier.** Opus xhigh revert 2026-08-04 (5b35096); Opus high
  2026-08-27 (3321cb2); Sonnet lanes 2026-09-04 (d86b694, 8249507, f9a4c17, 195048c).
- **Cheap models were enough.** The five 08-28 features (DIAG-FOLD-01, SPOILER-FEEDBACK-01,
  COPY-REPLY-01/02, decode animation, DRG glossary) all verified. Plan 26 phase 1 on Sonnet high landed
  three fixes and a device confirmation in under two hours. Opus medium fixed the DPS server error and
  did the dead-space measurement.
- **Usage-limit stalls:** 09-02 (three, Fable 5.1 max), 09-04 (two, one Fable max and one Opus high right
  after switching), 09-05 (two, Fable 5.1 max), 08-23 (one, Opus high with eight lanes running).

## 8. Calls for the maintainer (D59)

Answered in chat 2026-09-05: § 2 adopted as written (#1); Opus xhigh orchestrates bug and feature lane
sessions (#2); lanes return code, tests and a report only (#3); the short form lives in AGENTS.md, 'Which model does which work', with
this file as the evidence (#5); Haiku 4.5 goes on a measured trial for read-only lookups, dropped if Sonnet
has to step in (#4, § 4a).
